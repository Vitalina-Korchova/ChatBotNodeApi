import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { BotController } from './bot.controller';
import { WeatherService } from 'src/weather/weather.service';
import { CurrencyService } from 'src/currency/currency.service';

@Module({
  controllers: [BotController],
  providers: [BotService, WeatherService, CurrencyService],
})
export class BotModule {}
