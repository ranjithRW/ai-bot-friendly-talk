import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, PhoneOff } from 'lucide-react';
import { useChatService } from '../services/chatService';

interface VoiceChatProps {
  onClose: () => void;
  userName: string;
  userGender: string;
}

export default function VoiceChat({ onClose, userName, userGender }: VoiceChatProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'ai'; content: string }>>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { startListening, stopListening, isConnected, error, sendInitialGreeting, muteAudio, unmuteAudio } = useChatService({
    userName,
    userGender,
    onTranscript: (text) => setTranscript(text),
    onResponse: (text) => {
      setMessages((prev) => {
        // Check if this message already exists to prevent duplicates
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.role === 'ai' && lastMessage.content === text) {
          return prev; // Already exists, don't add duplicate
        }
        return [...prev, { role: 'ai', content: text }];
      });
      setIsSpeaking(true);
    },
    onUserMessage: (text) => {
      setMessages((prev) => {
        // Check if this message already exists to prevent duplicates
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.role === 'user' && lastMessage.content === text) {
          return prev; // Already exists, don't add duplicate
        }
        return [...prev, { role: 'user', content: text }];
      });
      setTranscript('');
    },
    onSpeakingComplete: () => {
      setIsSpeaking(false);
    },
  });

  useEffect(() => {
    if (isConnected && !hasGreeted && sendInitialGreeting) {
      sendInitialGreeting();
      setHasGreeted(true);
    }
  }, [isConnected, hasGreeted, sendInitialGreeting]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, transcript]);

  const handleToggleMic = async () => {
    if (isListening) {
      try {
        await stopListening();
      } catch (err) {
        console.error('Failed to stop listening:', err);
      } finally {
        setIsListening(false);
      }
      return;
    }

    setTranscript('');
    try {
      await startListening();
      setIsListening(true);
    } catch (err) {
      console.error('Failed to start listening:', err);
    }
  };

  const handleToggleMute = () => {
    if (isMuted) {
      unmuteAudio();
      setIsMuted(false);
    } else {
      muteAudio();
      setIsMuted(true);
    }
  };

  const handleEndCall = async () => {
    if (isListening) {
      await stopListening();
      setIsListening(false);
    }
    onClose();
  };

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Chat Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex h-2 w-2 rounded-full ${
              isConnected ? 'bg-emerald-400' : 'bg-yellow-400'
            }`}
          ></span>
          <span className="text-sm font-medium text-slate-700 sm:text-base">
            {isConnected ? 'Connected' : 'Connecting...'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleMic}
            className={`rounded-lg p-2 transition-colors ${
              isListening ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'text-slate-600 hover:bg-slate-100'
            }`}
            aria-label={isListening ? 'Mute microphone' : 'Unmute microphone'}
            title={isListening ? 'Mute your microphone' : 'Unmute your microphone'}
          >
            {isListening ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </button>
          <button
            onClick={handleToggleMute}
            className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            title={isMuted ? 'Unmute audio' : 'Mute audio'}
          >
            {isMuted ? (
              <VolumeX className="h-5 w-5" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={handleEndCall}
            className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
            aria-label="End call"
            title="End call"
          >
            <PhoneOff className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 sm:px-6">
          {error}
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-slate-50 px-3 py-4 sm:px-4 sm:py-6">
        <div className="mx-auto max-w-3xl space-y-3 sm:space-y-4">
          {/* {messages.length === 0 && !transcript && (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center text-slate-500 sm:min-h-[300px]">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm sm:h-20 sm:w-20">
                <Mic className="h-7 w-7 text-blue-600 sm:h-8 sm:w-8" />
              </div>
              <p className="text-base font-medium text-slate-600 sm:text-lg">Ready to chat</p>
              <p className="mt-1 text-sm text-slate-500">Tap the microphone to get started.</p>
            </div>
          )} */}

          {messages.map((message, idx) => (
            <div
              key={idx}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed sm:max-w-md sm:px-5 sm:py-3 sm:text-base ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-800 shadow-sm border border-slate-200'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}

          {transcript && (
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl bg-blue-500 px-4 py-2.5 text-sm text-white opacity-80 sm:max-w-md sm:px-5 sm:py-3 sm:text-base">
                {transcript}
              </div>
            </div>
          )}

          {isSpeaking && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 shadow-sm sm:px-5 sm:py-3 sm:text-base">
                <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>AI is speaking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Microphone Button Area */}
    </div>
  );
}
