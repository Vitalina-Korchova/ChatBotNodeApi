import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { WeatherService } from './weather.service';

@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get()
  async getWeather(@Query('city') city?: string) {
    if (!city) {
      throw new BadRequestException('City parameter is required');
    }

    return this.weatherService.getWeather(city);
  }
}
