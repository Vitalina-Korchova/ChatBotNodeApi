import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { CurrencyService } from './currency.service';

@Controller('currency')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}
  @Get()
  async getRate(@Query('from') from?: string, @Query('to') to?: string) {
    if (!from || !to) {
      throw new BadRequestException(
        'Both "from" and "to" parameters are required',
      );
    }

    return this.currencyService.getRate(from.toUpperCase(), to.toUpperCase());
  }
}
