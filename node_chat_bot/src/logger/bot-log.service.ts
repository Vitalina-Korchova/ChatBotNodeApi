import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';

export interface LogEntry {
  timestamp: string;
  type: string;
  query: string;
  result: 'success' | 'error' | 'invalid';
}

@Injectable()
export class BotLogService {
  private filePath = path.join(process.cwd(), 'bot-log.store.json');

  async logRequest(type: string, query: string, result: 'success' | 'error' | 'invalid'): Promise<void> {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      type,
      query,
      result,
    };

    const logs = await this.loadAllLogs();
    logs.push(entry);
    await this.saveAllLogs(logs);
  }

  async getStats() {
    const logs = await this.loadAllLogs();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const dayRequests = logs.filter(l => new Date(l.timestamp) >= oneDayAgo);
    const weekRequests = logs.filter(l => new Date(l.timestamp) >= oneWeekAgo);

    const commandStats: Record<string, number> = {};
    const errors: LogEntry[] = [];
    const invalidRequests: LogEntry[] = [];

    logs.forEach(l => {
      commandStats[l.type] = (commandStats[l.type] || 0) + 1;
      if (l.result === 'error') errors.push(l);
      if (l.result === 'invalid') invalidRequests.push(l);
    });

    const popularCommands = Object.entries(commandStats)
      .sort((a, b) => b[1] - a[1])
      .map(([cmd, count]) => ({ command: cmd, count }));

    return {
      dailyCount: dayRequests.length,
      weeklyCount: weekRequests.length,
      popularCommands,
      errorCount: errors.length,
      invalidCount: invalidRequests.length,
      totalCount: logs.length
    };
  }

  async generateJsonReport(): Promise<string> {
    const stats = await this.getStats();
    const reportRelativePath = 'report.json';
    const reportPath = path.join(process.cwd(), reportRelativePath);
    const report = {
      generatedAt: new Date().toISOString(),
      statistics: stats,
    };
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    return reportRelativePath;
  }

  private async loadAllLogs(): Promise<LogEntry[]> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(data) as LogEntry[];
    } catch {
      return [];
    }
  }

  private async saveAllLogs(logs: LogEntry[]) {
    await fs.writeFile(this.filePath, JSON.stringify(logs, null, 2));
  }
}
