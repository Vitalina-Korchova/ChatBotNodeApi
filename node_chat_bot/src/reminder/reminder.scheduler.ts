import { Injectable } from '@nestjs/common';
import { ReminderService } from './reminder.service';
import { UserService } from 'src/user/user.service';

import { Cron } from '@nestjs/schedule';

@Injectable()
export class ReminderScheduler {
  constructor(
    private readonly reminderService: ReminderService,
    private readonly userService: UserService,
  ) {}

  // кожну хвилину
  @Cron('* * * * *')
  async checkReminders() {
    console.log('⏰ Checking reminders...');

    const now = new Date();
    const reminders = await this.reminderService.getPending();

    for (const r of reminders) {
      const reminderTime = new Date(r.datetime);

      const diff = now.getTime() - reminderTime.getTime();

      if (diff >= 0 && diff < 60000) {
        const user = await this.userService.getById(r.userId);
        if (!user) continue;

        await fetch(
          `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chat_id: user.telegramId,
              text: `🔔 Reminder!\n📌 ${r.text}`,
            }),
          },
        );

        await this.reminderService.markDone(r.id);
      }
    }
  }
}
