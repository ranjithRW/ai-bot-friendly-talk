import { useState, useEffect, useCallback, useRef } from 'react';
import { DeepgramService } from './deepgramService';
import { OpenAIService } from './openaiService';
import { ElevenLabsService } from './elevenlabsService';

interface ChatServiceCallbacks {
  userName: string;
  userGender: string;
  onTranscript: (text: string) => void;
  onResponse: (text: string) => void;
  onUserMessage?: (text: string) => void;
  onSpeakingComplete: () => void;
}

export function useChatService(callbacks: ChatServiceCallbacks) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deepgram] = useState(() => new DeepgramService());
  const [openai] = useState(() => new OpenAIService());
  const [elevenlabs] = useState(() => new ElevenLabsService());
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [isMuted, setIsMuted] = useState(false);
  const processingRef = useRef(false);
  const lastProcessedMessageRef = useRef<string>('');
  const isInitializedRef = useRef(false);
  const initializationPromiseRef = useRef<Promise<void> | null>(null);
  const isListeningRef = useRef(false);
  
  // Initialize conversation history with user info
  useEffect(() => {
    const systemPrompt = `You are a friendly AI companion who speaks naturally and casually, just like a real friend. The user's name is ${callbacks.userName} and they are ${callbacks.userGender}.

Your personality traits:
- Warm, enthusiastic, and genuinely interested in conversations
- Use casual language and contractions (like "I'm", "you're", "that's")
- Show empathy and emotional intelligence
- Occasionally use friendly expressions like "Oh!", "Wow!", "That's awesome!", "I see!"
- Keep responses concise and conversational (2-3 sentences usually)
- Ask follow-up questions to keep the conversation flowing
- Be supportive and encouraging
- Use natural speech patterns with occasional filler words when appropriate
- React naturally to what the user says
- Remember context from earlier in the conversation
- Always address the user by their name: ${callbacks.userName}

Speak as if you're chatting with a close friend over coffee. Be genuine, relatable, and fun to talk to!`;

    setConversationHistory([
      {
        role: 'system',
        content: systemPrompt
      }
    ]);
  }, [callbacks.userName, callbacks.userGender]);

  useEffect(() => {
    return () => {
      deepgram.cleanup();
      elevenlabs.cleanup();
      isInitializedRef.current = false;
      initializationPromiseRef.current = null;
      isListeningRef.current = false;
    };
  }, [deepgram, elevenlabs]);

  const initializeIfNeeded = useCallback(async () => {
    if (isInitializedRef.current) {
      return;
    }

    if (!initializationPromiseRef.current) {
      initializationPromiseRef.current = deepgram
        .initialize()
        .then(() => {
          isInitializedRef.current = true;
          setIsConnected(true);
        })
        .catch((err) => {
          setError('Failed to connect to speech services');
          console.error(err);
          initializationPromiseRef.current = null;
          throw err;
        });
    }

    await initializationPromiseRef.current;
  }, [deepgram]);

  useEffect(() => {
    initializeIfNeeded().catch(() => {
      /* error already handled */
    });
  }, [initializeIfNeeded]);

  const processUserMessage = useCallback(async (message: string) => {
    if (!message || !message.trim()) return;

    // Prevent duplicate processing
    const messageKey = message.trim().toLowerCase();
    if (processingRef.current) {
      return;
    }

    if (lastProcessedMessageRef.current === messageKey) {
      // Allow same content again only after a different message
      return;
    }

    processingRef.current = true;
    lastProcessedMessageRef.current = messageKey;

    // Notify component of user message
    if (callbacks.onUserMessage) {
      callbacks.onUserMessage(message.trim());
    }

    const userMsg = { role: 'user', content: message.trim() };

    try {
      const updatedHistory = await new Promise<Array<{ role: string; content: string }>>((resolve) => {
        setConversationHistory((prev) => {
          const next = [...prev, userMsg];
          resolve(next);
          return next;
        });
      });

      const aiResponse = await openai.getResponse(updatedHistory);

      if (aiResponse) {
        await new Promise<void>((resolve) => {
          setConversationHistory((prev) => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content === aiResponse) {
              resolve();
              return prev; // Duplicate, skip
            }
            resolve();
            return [...prev, { role: 'assistant', content: aiResponse }];
          });
        });

        callbacks.onResponse(aiResponse);

        const resume = () => {
          processingRef.current = false;
        };

        if (!isMuted) {
          await elevenlabs.speak(aiResponse, () => {
            callbacks.onSpeakingComplete();
            resume();
          });
        } else {
          callbacks.onSpeakingComplete();
          resume();
        }
      } else {
        processingRef.current = false;
      }
    } catch (err) {
      setError('Failed to get AI response');
      console.error(err);
      processingRef.current = false;
    } finally {
      if (isListeningRef.current) {
        deepgram.resumeListening();
      }
    }
  }, [callbacks, deepgram, elevenlabs, isMuted, openai]);

  const startListening = useCallback(async () => {
    try {
      setError(null);
      await initializeIfNeeded();

      if (isListeningRef.current) {
        return;
      }

      await deepgram.startListening(
        (transcript) => {
          callbacks.onTranscript(transcript);
        },
        async (finalTranscript) => {
          // Automatically process when user stops speaking
          if (finalTranscript && finalTranscript.trim()) {
            await processUserMessage(finalTranscript);
          }
        }
      );

      isListeningRef.current = true;
    } catch (err) {
      setError('Failed to start listening');
      console.error(err);
    }
  }, [callbacks, processUserMessage, initializeIfNeeded]);

  const stopListening = useCallback(async () => {
    try {
      if (!isListeningRef.current) {
        return '';
      }

      const finalTranscript = await deepgram.stopListening();
      isListeningRef.current = false;
      return finalTranscript || '';
    } catch (err) {
      console.error('Error stopping listening:', err);
      return '';
    }
  }, [deepgram]);


  const muteAudio = useCallback(() => {
    setIsMuted(true);
    elevenlabs.cleanup();
  }, [elevenlabs]);

  const unmuteAudio = useCallback(() => {
    setIsMuted(false);
  }, []);

  const sendInitialGreeting = useCallback(async () => {
    try {
      // Wait a bit to ensure conversation history is initialized
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const greetingMessage = `Hi ${callbacks.userName}, how are you?`;
      
      setConversationHistory((prevHistory) => {
        const currentHistory = prevHistory.length > 0 
          ? prevHistory 
          : [{ role: 'system', content: `You are a friendly AI companion. The user's name is ${callbacks.userName}.` }];
        
        return [
          ...currentHistory,
          { role: 'assistant', content: greetingMessage }
        ];
      });

      callbacks.onResponse(greetingMessage);

      const autoStart = () => {
        setTimeout(async () => {
          try {
            await startListening();
          } catch (err) {
            console.error('Auto-start listening failed:', err);
          }
        }, 500);
      };

      if (!isMuted) {
        await elevenlabs.speak(greetingMessage, () => {
          callbacks.onSpeakingComplete();
          autoStart();
        });
      } else {
        callbacks.onSpeakingComplete();
        autoStart();
      }
    } catch (err) {
      console.error('Error sending initial greeting:', err);
    }
  }, [callbacks, elevenlabs, isMuted, startListening]);

  return {
    startListening,
    stopListening,
    isConnected,
    error,
    sendInitialGreeting,
    muteAudio,
    unmuteAudio,
    processUserMessage,
  };
}
