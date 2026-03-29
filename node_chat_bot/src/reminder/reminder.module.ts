import { Module } from '@nestjs/common';
import { ReminderService } from './reminder.service';
import { ReminderController } from './reminder.controller';
import { ReminderScheduler } from './reminder.scheduler';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [UserModule],
  controllers: [ReminderController],
  providers: [ReminderService, ReminderScheduler],
})
export class ReminderModule {}
