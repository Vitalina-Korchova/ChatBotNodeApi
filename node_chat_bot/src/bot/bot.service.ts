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
import { TranslateService } from 'src/translate/translate.service';
import { BotLogService } from 'src/logger/bot-log.service';

@Injectable()
export class BotService implements OnModuleInit {
  private bot!: Telegraf<Context>;

  constructor(
    private readonly weatherService: WeatherService,
    private readonly currencyService: CurrencyService,
    private readonly nlpService: NlpService,
    private readonly userService: UserService,
    private readonly reminderService: ReminderService,
    private readonly translateService: TranslateService,
    private readonly botLogService: BotLogService,
  ) { }

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
    this.bot.start(async (ctx) => {
      await this.botLogService.logRequest('start', ctx.message?.text || '', 'success');
      return sendHelp(ctx);
    });

    // /stats command - Formulate report
    this.bot.command('stats', async (ctx) => {
      try {
        const stats = await this.botLogService.getStats();
        const reportFile = await this.botLogService.generateJsonReport();
        await ctx.reply(
          `📊 *Bot Statistics*\n\n` +
          `Total: ${stats.totalCount}\n` +
          `Day: ${stats.dailyCount}\n` +
          `Week: ${stats.weeklyCount}\n` +
          `Errors: ${stats.errorCount}\n` +
          `Invalid: ${stats.invalidCount}\n\n` +
          `Top Command: ${stats.popularCommands[0]?.command || 'N/A'}\n\n` +
          `✅ Report saved to ${reportFile}`,
          { parse_mode: 'Markdown' }
        );
      } catch (e) {
        console.error(e);
        await ctx.reply('❌ Error generating report.');
      }
    });

    // /weather command
    this.bot.command('weather', async (ctx) => {
      const telegramId = ctx.from?.id;
      if (!telegramId) return;

      const user = await this.userService.findOrCreate(
        telegramId,
        ctx.from?.first_name,
      );

      const city = ctx.message?.text.split(' ')[1] || user.favoriteCity;
      if (!city) {
        await this.botLogService.logRequest('weather', ctx.message?.text || '', 'invalid');
        return ctx.reply('⚠️ Please provide a city. Example: /weather Paris');
      }

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

      if (!from || !to) {
        await this.botLogService.logRequest('currency', ctx.message?.text || '', 'invalid');
        return ctx.reply(
          '⚠️ Please provide currencies. Example: /currency USD UAH',
        );
      }

      await this.handleCurrency(ctx, from, to);
    });

    // /setcity command
    this.bot.command('setcity', async (ctx) => {
      const telegramId = ctx.from?.id;
      if (!telegramId) return;

      const city = ctx.message?.text.split(' ')[1];
      if (!city) {
        await this.botLogService.logRequest('setcity', ctx.message?.text || '', 'invalid');
        return ctx.reply('⚠️ Example: /setcity Paris');
      }

      await this.userService.update(telegramId, { favoriteCity: city });
      await this.botLogService.logRequest('setcity', city, 'success');
      ctx.reply(`✅ Favorite city set to ${city}`);
    });

    // /setlanguage command
    this.bot.command('setlanguage', async (ctx) => {
      const telegramId = ctx.from?.id;
      if (!telegramId) return;

      const lang = ctx.message?.text.split(' ')[1];
      if (!lang) {
        await this.botLogService.logRequest('setlanguage', ctx.message?.text || '', 'invalid');
        return ctx.reply('⚠️ Example: /setlanguage en');
      }

      await this.userService.update(telegramId, { language: lang });
      await this.botLogService.logRequest('setlanguage', lang, 'success');
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
            await this.botLogService.logRequest('reminder', text, 'invalid');
            return ctx.reply('⚠️ Could not parse reminder.');
          }

          const { datetime, text: reminderText } = nlpResult.reminder;

          //  get user
          const user = await this.userService.findOrCreate(
            telegramId,
            ctx.from?.first_name,
          );

          // save id
          await this.reminderService.create(user.id, reminderText, datetime);

          await ctx.reply(`⏰ Reminder set!\n📅 ${datetime}\n📌 ${reminderText}`);
          await this.botLogService.logRequest('reminder', reminderText, 'success');

          break;
        }

        case 'translate': {
          if (!nlpResult.translation) {
            return ctx.reply('⚠️ No translation details found.');
          }

          const { text, language_code, target_language } =
            nlpResult.translation;

          await this.handleTranslate(ctx, text, language_code, target_language);
          break;
        }

        default:
          await this.botLogService.logRequest('unknown', text, 'invalid');
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
        await this.botLogService.logRequest('weather', city, 'invalid');
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
      await this.botLogService.logRequest('weather', city, 'success');
    } catch (error) {
      console.error(error);
      await this.botLogService.logRequest('weather', city, 'error');
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
        await this.botLogService.logRequest('currency', `${from}-${to}`, 'error');
        await ctx.reply('❌ Could not fetch currency rate.');
        return;
      }

      const { data, source } = result as {
        data: FormattedCurrencyResponse;
        source: string;
      };
      const rate = data.rates[to];
      if (!rate) {
        await this.botLogService.logRequest('currency', `${from}-${to}`, 'invalid');
        await ctx.reply('❌ Invalid currency pair.');
        return;
      }

      const replyText = `💱 1 ${data.base} = ${rate} ${to} (${source})`;
      await ctx.reply(replyText);
      await this.botLogService.logRequest('currency', `${from}-${to}`, 'success');
    } catch (error) {
      console.error(error);
      await this.botLogService.logRequest('currency', `${from}-${to}`, 'error');
      await ctx.reply(
        '❌ Error fetching currency rate. Please try again later.',
      );
    }
  }

  private async handleTranslate(
    ctx: Context,
    text: string,
    targetCode: string,
    targetName: string,
  ): Promise<void> {
    try {
      const translated = await this.translateService.translate(
        text,
        targetCode,
      );

      const replyText =
        `🌐 Translation into ${targetName}:\n` +
        `📝 Source: ${text}\n` +
        `✅ Result: ${translated}`;

      await ctx.reply(replyText);
      await this.botLogService.logRequest('translate', targetName, 'success');
    } catch (error) {
      console.error(error);
      await this.botLogService.logRequest('translate', targetName, 'error');
      await ctx.reply(
        '❌ Error performing translation. Please check API key or try again.',
      );
    }
  }
}
