import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import {
  CurrencyApiResponse,
  FormattedCurrencyResponse,
} from './currency.type';

// Типізований кеш: ключ буде `${from}_${to}`
const cache = new Map<string, FormattedCurrencyResponse>();

@Injectable()
export class CurrencyService {
  async getRate(from: string, to: string) {
    const cacheKey = `currency_${from}_${to}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      return {
        source: 'cache',
        data: cached,
      };
    }

    const url = `https://api.freecurrencyapi.com/v1/latest?apikey=${process.env.CURRENCY_API_KEY}&base_currency=${from}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new HttpException(
        'Currency API unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const rawData: unknown = await response.json();
    const data = rawData as CurrencyApiResponse;

    const rate = data.data[to];
    if (rate === undefined) {
      throw new HttpException(
        `Currency "${to}" not found`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const formatted: FormattedCurrencyResponse = {
      base: from,
      rates: {
        [to]: rate,
      },
    };

    cache.set(cacheKey, formatted);

    return {
      source: 'api',
      data: formatted,
    };
  }
}
