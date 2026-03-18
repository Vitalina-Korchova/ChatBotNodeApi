import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { User } from './user.type';

@Injectable()
export class UserService {
  private filePath = path.join(process.cwd(), 'user.store.json');

  async findOrCreate(telegramId: number, name?: string): Promise<User> {
    const users = await this.loadAllUsers();
    let user = users.find((u) => u.telegramId === telegramId);

    if (!user) {
      user = new User(telegramId, name);
      users.push(user);
      await this.saveAllUsers(users);
      console.log('Saving users to:', this.filePath);
    }

    return user;
  }

  // Update a user
  async update(telegramId: number, updates: Partial<User>): Promise<User> {
    const users = await this.loadAllUsers();
    let user = users.find((u) => u.telegramId === telegramId);

    if (!user) {
      user = new User(telegramId);
      users.push(user);
    }

    Object.assign(user, updates);

    await this.saveAllUsers(users);

    return user;
  }

  // Get a user by telegramId
  async get(telegramId: number): Promise<User | null> {
    const users = await this.loadAllUsers();
    return users.find((u) => u.telegramId === telegramId) || null;
  }

  // Helper to read JSON
  private async loadAllUsers(): Promise<User[]> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(data) as User[];
    } catch {
      return [];
    }
  }

  // Helper to write JSON
  private async saveAllUsers(users: User[]) {
    console.log('Saving users:', users);
    await fs.writeFile(this.filePath, JSON.stringify(users, null, 2));
  }
}
