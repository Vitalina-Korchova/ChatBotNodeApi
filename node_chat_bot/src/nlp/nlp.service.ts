import { Injectable } from '@nestjs/common';
import { NlpResult } from './nlp.type';

@Injectable()
export class NlpService {
  private nlpUrl: string;

  constructor() {
    if (!process.env.NLP_SERVICE) {
      throw new Error('NLP_SERVICE is not set in .env');
    }
    this.nlpUrl = process.env.NLP_SERVICE;
  }

  async parseText(text: string): Promise<NlpResult> {
    try {
      const res = await fetch(this.nlpUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        console.error('NLP service returned error', res.status);
        return { intent: 'unknown' };
      }

      const data = (await res.json()) as NlpResult;
      return data;
    } catch (err) {
      console.error('NLP fetch error:', err);
      return { intent: 'unknown' };
    }
  }
}
