export class ElevenLabsService {
  private utterance: SpeechSynthesisUtterance | null = null;

  private getVoices(): Promise<SpeechSynthesisVoice[]> {
    return new Promise((resolve) => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        resolve(voices);
      } else {
        // Wait for voices to load
        window.speechSynthesis.onvoiceschanged = () => {
          resolve(window.speechSynthesis.getVoices());
        };
        // Fallback timeout
        setTimeout(() => {
          resolve(window.speechSynthesis.getVoices());
        }, 100);
      }
    });
  }

  async speak(text: string, onComplete: () => void) {
    try {
      // Check if browser supports Web Speech API
      if (!('speechSynthesis' in window)) {
        console.warn('Speech synthesis not supported, skipping audio');
        onComplete();
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      // Wait for voices to be available
      const voices = await this.getVoices();

      // Create new utterance
      this.utterance = new SpeechSynthesisUtterance(text);
      
      // Configure voice settings
      this.utterance.rate = 1.0; // Normal speed
      this.utterance.pitch = 1.0; // Normal pitch
      this.utterance.volume = 1.0; // Full volume

      // Try to use a natural-sounding voice if available
      const preferredVoice =
        voices.find(
          (voice) =>
            voice.lang.includes('en') &&
            (voice.name.includes('Natural') ||
              voice.name.includes('Premium') ||
              voice.name.includes('Enhanced') ||
              voice.localService === false)
        ) || voices.find((voice) => voice.lang.startsWith('en'));

      if (preferredVoice) {
        this.utterance.voice = preferredVoice;
      }

      // Handle completion
      this.utterance.onend = () => {
        this.utterance = null;
        onComplete();
      };

      this.utterance.onerror = (error) => {
        console.error('Speech synthesis error:', error);
        this.utterance = null;
        onComplete();
      };

      // Speak the text
      window.speechSynthesis.speak(this.utterance);
    } catch (error) {
      console.error('Speech synthesis error:', error);
      onComplete();
    }
  }

  cleanup() {
    // Cancel any ongoing speech
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.utterance = null;
  }
}
