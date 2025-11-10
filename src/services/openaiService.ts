import OpenAI from 'openai';

export class OpenAIService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true,
    });
  }

  async getResponse(messages: Array<{ role: string; content: string }>): Promise<string> {
    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages as any,
        temperature: 0.9,
        max_tokens: 150,
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('OpenAI error:', error);
      throw error;
    }
  }
}
