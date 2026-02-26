import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { NewsApiResponse, NewsArticle } from './news.type';

const cache = new Map<string, NewsArticle[]>();

@Injectable()
export class NewsService {
  async getTopNews(
    country: string,
  ): Promise<{ source: string; data: NewsArticle[] }> {
    const cacheKey = `news_${country}`;

    // перевірка кешу
    const cached = cache.get(cacheKey);
    if (cached) {
      return {
        source: 'cache',
        data: cached,
      };
    }

    const url = `https://newsapi.org/v2/top-headlines?country=${country}&apiKey=${process.env.NEWS_API_KEY}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new HttpException(
        'News API unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const rawData: unknown = await response.json();
    const data = rawData as NewsApiResponse;

    // Форматуємо тільки потрібні поля
    const formatted: NewsArticle[] = data.articles
      .slice(0, 10)
      .map((article) => ({
        title: article.title,
        source: article.source.name,
        url: article.url,
        publishedAt: article.publishedAt,
      }));

    cache.set(cacheKey, formatted);

    return {
      source: 'api',
      data: formatted,
    };
  }
}
