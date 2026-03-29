import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { WeatherModule } from './weather/weather.module';
import { CurrencyModule } from './currency/currency.module';
import { NewsModule } from './news/news.module';
import { LoggerMiddleware } from './logger/logger.middleware';
import { BotModule } from './bot/bot.module';
import { NlpModule } from './nlp/nlp.module';
import { UserModule } from './user/user.module';
import { ReminderModule } from './reminder/reminder.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    WeatherModule,
    CurrencyModule,
    NewsModule,
    BotModule,
    NlpModule,
    UserModule,
    ReminderModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*'); // логувати всі маршрути
  }
}
