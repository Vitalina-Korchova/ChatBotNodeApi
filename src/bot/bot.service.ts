// bot.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { CurrencyService } from 'src/currency/currency.service';
import { FormattedCurrencyResponse } from 'src/currency/currency.type';
import { WeatherService } from 'src/weather/weather.service';
import { WeatherData } from 'src/weather/weather.type';
import { Telegraf, Context } from 'telegraf';

@Injectable()
export class BotService implements OnModuleInit {
  private bot!: Telegraf<Context>;

  constructor(
    private readonly weatherService: WeatherService,
    private readonly currencyService: CurrencyService,
  ) {}

  onModuleInit(): void {
    const token = process.env.TELEGRAM_TOKEN;
    if (!token) throw new Error('TELEGRAM_TOKEN is not set');

    this.bot = new Telegraf(token);

    // helper для показу інструкції
    const sendHelp = (ctx: Context) =>
      ctx.reply(
        '👋 Hello! I can provide weather info and currency rates.\n\n' +
          'Use commands or type naturally:\n' +
          '🌤 /weather <city> or "погода в Києві"\n' +
          '💱 /currency <from> <to> or "1 USD в UAH"',
      );

    // /start
    this.bot.start(sendHelp);

    // /weather
    this.bot.command('weather', async (ctx) => {
      const city = ctx.message?.text.split(' ')[1];
      if (!city)
        return ctx.reply('⚠️ Please provide a city. Example: /weather Paris');
      await this.handleWeather(ctx, city);
    });

    // /currency
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

    // прості повідомлення
    this.bot.on('text', async (ctx) => {
      const text = ctx.message?.text.toLowerCase() ?? '';
      // погода
      if (text.includes('Kiyv') || text.includes('weather')) {
        const cityMatch =
          text.match(/в\s+([а-яa-z\s]+)/i) ??
          text.match(/weather\s+in\s+([a-z\s]+)/i);
        const city = cityMatch?.[1]?.trim();
        if (!city) return ctx.reply('⚠️ Please provide a city. Example: "Kyiv');
        await this.handleWeather(ctx, city);
        return;
      }

      // валюти
      if (
        text.includes('usd') ||
        text.includes('uah') ||
        text.includes('eur')
      ) {
        const match = text.match(/([a-z]{3}).*?([a-z]{3})/i);
        const from = match?.[1]?.toUpperCase();
        const to = match?.[2]?.toUpperCase();
        if (!from || !to) return sendHelp(ctx);
        await this.handleCurrency(ctx, from, to);
        return;
      }

      // невідомий текст
      sendHelp(ctx);
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
