import { Injectable, OnModuleInit } from '@nestjs/common';
import { Telegraf, Context } from 'telegraf';
import { WeatherService } from 'src/weather/weather.service';
import { WeatherData } from 'src/weather/weather.type';
import { CurrencyService } from 'src/currency/currency.service';
import { FormattedCurrencyResponse } from 'src/currency/currency.type';
import { NlpService } from 'src/nlp/nlp.service';
import { NlpResult } from 'src/nlp/nlp.type';

@Injectable()
export class BotService implements OnModuleInit {
  private bot!: Telegraf<Context>;

  constructor(
    private readonly weatherService: WeatherService,
    private readonly currencyService: CurrencyService,
    private readonly nlpService: NlpService,
  ) {}

  onModuleInit(): void {
    const token = process.env.TELEGRAM_TOKEN;
    if (!token) throw new Error('TELEGRAM_TOKEN is not set');

    this.bot = new Telegraf(token);

    const sendHelp = (ctx: Context) =>
      ctx.reply(
        '👋 Hello! I can provide weather info and currency rates.\n\n' +
          'Use commands or type naturally:\n' +
          '🌤 /weather <city> or ask "weather in <city>"\n' +
          '💱 /currency <from> <to> or "convert 100 USD to UAH"',
      );

    // /start
    this.bot.start(sendHelp);

    // /weather command
    this.bot.command('weather', async (ctx) => {
      const city = ctx.message?.text.split(' ')[1];
      if (!city)
        return ctx.reply('⚠️ Please provide a city. Example: /weather Paris');
      await this.handleWeather(ctx, city);
    });

    // /currency command
    this.bot.command('currency', async (ctx) => {
      const parts = ctx.message?.text.split(' ');
      const from = parts?.[1]?.toUpperCase();
      const to = parts?.[2]?.toUpperCase();
      if (!from || !to)
        return ctx.reply(
          '⚠️ Please provide currencies. Example: /currency USD UAH',
        );
      await this.handleCurrency(ctx, from, to);
    });

    this.bot.on('text', async (ctx) => {
      const text = ctx.message?.text ?? '';

      //  NLP сервіс
      const nlpResult: NlpResult = await this.nlpService.parseText(text);

      switch (nlpResult.intent) {
        case 'weather':
          if (!nlpResult.city)
            return ctx.reply('⚠️ Please provide a city for weather info.');
          await this.handleWeather(ctx, nlpResult.city);
          break;

        case 'currency':
          if (!nlpResult.from || !nlpResult.to)
            return ctx.reply('⚠️ Could not determine currency.');
          await this.handleCurrency(ctx, nlpResult.from, nlpResult.to);
          break;

        default:
          sendHelp(ctx);
      }
    });

    void this.bot.launch().then(() => console.log('🤖 Bot started'));
  }

  private async handleWeather(ctx: Context, city: string): Promise<void> {
    try {
      const result = await this.weatherService.getWeather(city);
      const data = result.data as WeatherData;
      if (!data || !data.city) {
        await ctx.reply('❌ Could not find weather for this city.');
        return;
      }
      await ctx.reply(
        `🌤 Weather in ${data.city}, ${data.country}:\n` +
          `🌡 Temperature: ${data.temperature}°C\n` +
          `💨 Wind: ${data.wind_kph} kph\n` +
          `💧 Humidity: ${data.humidity}%\n` +
          `📄 Condition: ${data.condition}`,
      );
    } catch (error) {
      console.error(error);
      await ctx.reply('❌ Error fetching weather. Please try again later.');
    }
  }

  private async handleCurrency(
    ctx: Context,
    from: string,
    to: string,
  ): Promise<void> {
    try {
      const result = await this.currencyService.getRate(from, to);
      if (!result?.data?.rates) {
        await ctx.reply('❌ Could not fetch currency rate.');
        return;
      }
      const { data, source } = result as {
        data: FormattedCurrencyResponse;
        source: string;
      };
      const rate = data.rates[to];
      if (!rate) {
        await ctx.reply('❌ Invalid currency pair.');
        return;
      }
      await ctx.reply(`💱 1 ${data.base} = ${rate} ${to} (${source})`);
    } catch (error) {
      console.error(error);
      await ctx.reply(
        '❌ Error fetching currency rate. Please try again later.',
      );
    }
  }
}
