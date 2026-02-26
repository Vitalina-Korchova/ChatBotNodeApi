import { Controller, Get, Query } from '@nestjs/common';
import { NewsService } from './news.service';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}
  @Get()
  async getNews(@Query('country') country: string) {
    return this.newsService.getTopNews(country.toLowerCase());
  }
}
