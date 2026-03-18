export class User {
  id: number;
  telegramId: number;
  name?: string;
  language?: string;
  favoriteCity?: string;
  createdAt: Date;
  constructor(
    telegramId: number,
    name?: string,
    language?: string,
    favoriteCity?: string,
  ) {
    this.id = Date.now();
    this.telegramId = telegramId;
    this.name = name;
    this.language = language;
    this.favoriteCity = favoriteCity;
    this.createdAt = new Date();
  }
}
