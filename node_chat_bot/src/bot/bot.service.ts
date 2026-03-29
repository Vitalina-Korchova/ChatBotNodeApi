import { Injectable, OnModuleInit } from '@nestjs/common';
import { Telegraf, Context } from 'telegraf';
import { WeatherService } from 'src/weather/weather.service';
import { WeatherData } from 'src/weather/weather.type';
import { CurrencyService } from 'src/currency/currency.service';
import { FormattedCurrencyResponse } from 'src/currency/currency.type';
import { NlpService } from 'src/nlp/nlp.service';
import { NlpResult } from 'src/nlp/nlp.type';
import { UserService } from 'src/user/user.service';
import { ReminderService } from 'src/reminder/reminder.service';

@Injectable()
export class BotService implements OnModuleInit {
  private bot!: Telegraf<Context>;

  constructor(
    private readonly weatherService: WeatherService,
    private readonly currencyService: CurrencyService,
    private readonly nlpService: NlpService,
    private readonly userService: UserService,
    private readonly reminderService: ReminderService,
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
          '💱 /currency <from> <to> or "convert 100 USD to UAH"\n' +
          '⚙️ /setcity <city> - set your favorite city\n' +
          '⚙️ /setlanguage <en|fr|...> - set response language',
      );

    // /start
    this.bot.start(sendHelp);

    // /weather command
    this.bot.command('weather', async (ctx) => {
      const telegramId = ctx.from?.id;
      if (!telegramId) return;

      const user = await this.userService.findOrCreate(
        telegramId,
        ctx.from?.first_name,
      );

      const city = ctx.message?.text.split(' ')[1] || user.favoriteCity;
      if (!city)
        return ctx.reply('⚠️ Please provide a city. Example: /weather Paris');

      await this.handleWeather(ctx, city);
    });

    // /currency command
    this.bot.command('currency', async (ctx) => {
      const telegramId = ctx.from?.id;
      if (!telegramId) return;

      await this.userService.findOrCreate(telegramId, ctx.from?.first_name);

      const parts = ctx.message?.text.split(' ');
      const from = parts?.[1]?.toUpperCase();
      const to = parts?.[2]?.toUpperCase();

      if (!from || !to)
        return ctx.reply(
          '⚠️ Please provide currencies. Example: /currency USD UAH',
        );

      await this.handleCurrency(ctx, from, to);
    });

    // /setcity command
    this.bot.command('setcity', async (ctx) => {
      const telegramId = ctx.from?.id;
      if (!telegramId) return;

      const city = ctx.message?.text.split(' ')[1];
      if (!city) return ctx.reply('⚠️ Example: /setcity Paris');

      await this.userService.update(telegramId, { favoriteCity: city });
      ctx.reply(`✅ Favorite city set to ${city}`);
    });

    // /setlanguage command
    this.bot.command('setlanguage', async (ctx) => {
      const telegramId = ctx.from?.id;
      if (!telegramId) return;

      const lang = ctx.message?.text.split(' ')[1];
      if (!lang) return ctx.reply('⚠️ Example: /setlanguage en');

      await this.userService.update(telegramId, { language: lang });
      ctx.reply(`✅ Language set to ${lang}`);
    });

    // Handle plain text messages with NLP
    this.bot.on('text', async (ctx) => {
      const telegramId = ctx.from?.id;
      if (!telegramId) return;

      const user = await this.userService.findOrCreate(
        telegramId,
        ctx.from?.first_name,
      );

      const text = ctx.message?.text ?? '';
      const nlpResult: NlpResult = await this.nlpService.parseText(text);

      switch (nlpResult.intent) {
        case 'weather': {
          const city = nlpResult.city || user.favoriteCity;
          if (!city)
            return ctx.reply('⚠️ Please provide a city for weather info.');
          await this.handleWeather(ctx, city);
          break;
        }

        case 'currency': {
          if (!nlpResult.from || !nlpResult.to)
            return ctx.reply('⚠️ Could not determine currency.');
          await this.handleCurrency(ctx, nlpResult.from, nlpResult.to);
          break;
        }

        // reminder added
        case 'reminder': {
          if (!nlpResult.reminder) {
            return ctx.reply('⚠️ Could not parse reminder.');
          }

          const { datetime, text } = nlpResult.reminder;

          //  get user
          const user = await this.userService.findOrCreate(
            telegramId,
            ctx.from?.first_name,
          );

          // save id
          await this.reminderService.create(user.id, text, datetime);

          await ctx.reply(`⏰ Reminder set!\n📅 ${datetime}\n📌 ${text}`);

          break;
        }

        default:
          sendHelp(ctx);
      }
    });

    void this.bot.launch().then(() => console.log('🤖 Bot started'));
  }

  // Weather handler uses user.language for replies
  private async handleWeather(ctx: Context, city: string): Promise<void> {
    try {
      const result = await this.weatherService.getWeather(city);
      const data = result.data as WeatherData;
      if (!data || !data.city) {
        await ctx.reply('❌ Could not find weather for this city.');
        return;
      }

      const replyText =
        `🌤 Weather in ${data.city}, ${data.country}:\n` +
        `🌡 Temperature: ${data.temperature}°C\n` +
        `💨 Wind: ${data.wind_kph} kph\n` +
        `💧 Humidity: ${data.humidity}%\n` +
        `📄 Condition: ${data.condition}`;

      await ctx.reply(replyText);
    } catch (error) {
      console.error(error);
      await ctx.reply('❌ Error fetching weather. Please try again later.');
    }
  }

  // Currency handler
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

      const replyText = `💱 1 ${data.base} = ${rate} ${to} (${source})`;
      await ctx.reply(replyText);
    } catch (error) {
      console.error(error);
      await ctx.reply(
        '❌ Error fetching currency rate. Please try again later.',
      );
    }
  }
}
