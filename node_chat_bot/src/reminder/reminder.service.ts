import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { Reminder } from './reminder.type';

@Injectable()
export class ReminderService {
  private filePath = path.join(process.cwd(), 'reminder.store.json');

  // CREATE
  async create(userId: number, text: string, datetime: string) {
    const reminders = await this.loadAll();

    const reminder = new Reminder(userId, text, datetime);
    reminders.push(reminder);

    await this.saveAll(reminders);

    return reminder;
  }

  // GET ALL BY USER
  async findAllByUser(userId: number) {
    const reminders = await this.loadAll();
    return reminders.filter((r) => r.userId === userId);
  }

  //  GET PENDING (для scheduler)
  async getPending() {
    const reminders = await this.loadAll();
    return reminders.filter((r) => !r.isDone);
  }

  //  MARK DONE
  async markDone(id: number) {
    const reminders = await this.loadAll();

    const reminder = reminders.find((r) => r.id === id);
    if (reminder) {
      reminder.isDone = true;
    }

    await this.saveAll(reminders);
  }

  //  DELETE
  async delete(id: number) {
    const reminders = await this.loadAll();

    const filtered = reminders.filter((r) => r.id !== id);

    await this.saveAll(filtered);
  }

  //  READ FILE
  private async loadAll(): Promise<Reminder[]> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(data) as Reminder[];
    } catch {
      return [];
    }
  }

  //  WRITE FILE
  private async saveAll(reminders: Reminder[]) {
    await fs.writeFile(this.filePath, JSON.stringify(reminders, null, 2));
  }
}
