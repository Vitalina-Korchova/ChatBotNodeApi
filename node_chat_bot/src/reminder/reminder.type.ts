export class Reminder {
  id: number;
  userId: number;
  text: string;
  datetime: string;
  isDone: boolean;

  constructor(userId: number, text: string, datetime: string) {
    this.id = Date.now();
    this.userId = userId;
    this.text = text;
    this.datetime = datetime;
    this.isDone = false;
  }
}
