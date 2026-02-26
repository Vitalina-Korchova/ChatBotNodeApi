import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { WeatherResponse } from './weather.type';

const cache = new Map<string, any>();

@Injectable()
export class WeatherService {
  async getWeather(city: string) {
    const cacheKey = `weather_${city.toLowerCase()}`;

    // Перевірка кешу
    if (cache.has(cacheKey)) {
      return {
        source: 'cache',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: cache.get(cacheKey),
      };
    }

    // 🔹 Запит до WeatherAPI
    const response = await fetch(
      `https://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API_KEY}&q=${city}&aqi=no`,
    );

    if (!response.ok) {
      throw new HttpException(
        'Weather API unavailable or city not found',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const data = (await response.json()) as WeatherResponse;

    const formatted = {
      city: data.location.name,
      country: data.location.country,
      temperature: data.current.temp_c,
      condition: data.current.condition.text,
      humidity: data.current.humidity,
      wind_kph: data.current.wind_kph,
    };

    // кешування
    cache.set(cacheKey, formatted);

    return {
      source: 'api',
      data: formatted,
    };
  }
}
