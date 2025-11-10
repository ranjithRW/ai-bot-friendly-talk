import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

export class DeepgramService {
  private connection: any;
  private mediaRecorder: MediaRecorder | null = null;
  private currentTranscript = '';
  private onTranscriptCallback: ((text: string) => void) | null = null;
  private onUtteranceEndCallback: ((text: string) => void) | null = null;
  private stream: MediaStream | null = null;

  async initialize() {
    const deepgram = createClient(import.meta.env.VITE_DEEPGRAM_API_KEY);

    this.connection = deepgram.listen.live({
      model: 'nova-2',
      language: 'en-US',
      smart_format: true,
      interim_results: true,
      utterance_end_ms: 1500, // Wait 1.5 seconds of silence before considering utterance complete
      vad_events: true,
    });

    await new Promise((resolve) => {
      this.connection.on(LiveTranscriptionEvents.Open, resolve);
    });

    // Listen for utterance end events (when user stops speaking)
    this.connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
      if (this.currentTranscript && this.currentTranscript.trim() && this.onUtteranceEndCallback) {
        const finalTranscript = this.currentTranscript.trim();
        this.currentTranscript = '';
        this.onUtteranceEndCallback(finalTranscript);
      }
    });
  }

  async startListening(
    onTranscript: (text: string) => void,
    onUtteranceEnd?: (text: string) => void
  ) {
    this.currentTranscript = '';
    this.onTranscriptCallback = onTranscript;
    this.onUtteranceEndCallback = onUtteranceEnd || null;

    if (!this.stream) {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }

    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      return; // Already recording
    }

    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: 'audio/webm' });

    this.connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
      const transcript = data.channel.alternatives[0].transcript;

      if (transcript && transcript.trim() !== '') {
        if (data.is_final) {
          this.currentTranscript += (this.currentTranscript ? ' ' : '') + transcript;
          if (this.onTranscriptCallback) {
            this.onTranscriptCallback(this.currentTranscript);
          }
        }
      }
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && this.connection) {
        this.connection.send(event.data);
      }
    };

    this.mediaRecorder.start(250);
  }

  async stopListening(): Promise<string> {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    const finalTranscript = this.currentTranscript;
    this.currentTranscript = '';
    return finalTranscript;
  }

  pauseListening() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
    }
  }

  resumeListening() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
    }
  }

  cleanup() {
    if (this.connection) {
      this.connection.finish();
    }
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.currentTranscript = '';
  }
}
