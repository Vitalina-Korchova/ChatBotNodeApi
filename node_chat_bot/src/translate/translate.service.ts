import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { TranslateRequest, TranslateResponse } from './translate.type';

@Injectable()
export class TranslateService {
  async translate(text: string, targetLanguage: string): Promise<string> {
    const apiKey = process.env.TRANSLATE_API_KEY;
    if (!apiKey) {
      console.error('LANGBLY_API_KEY is not set');
      throw new HttpException(
        'Translation service configuration error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const payload: TranslateRequest = {
      q: text,
      target: targetLanguage,
    };

    try {
      const response = await fetch(
        'https://api.langbly.com/language/translate/v2',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Translation Open API error:', errorData);
        throw new HttpException(
          'Translation API unavailable',
          HttpStatus.BAD_GATEWAY,
        );
      }

      const result = (await response.json()) as TranslateResponse;

      if (!result.data?.translations || result.data.translations.length === 0) {
        throw new HttpException('No translation found', HttpStatus.NOT_FOUND);
      }

      return result.data.translations[0].translatedText;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Translation error:', error);
      throw new HttpException(
        'Internal translation error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
