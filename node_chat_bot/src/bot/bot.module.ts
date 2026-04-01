import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { BotController } from './bot.controller';
import { WeatherService } from 'src/weather/weather.service';
import { CurrencyService } from 'src/currency/currency.service';
import { NlpService } from 'src/nlp/nlp.service';
import { UserService } from 'src/user/user.service';
import { ReminderService } from 'src/reminder/reminder.service';
import { TranslateService } from 'src/translate/translate.service';

@Module({
  controllers: [BotController],
  providers: [
    BotService,
    WeatherService,
    CurrencyService,
    NlpService,
    UserService,
    ReminderService,
    TranslateService,
  ],
})
export class BotModule {}
