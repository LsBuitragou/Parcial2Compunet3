//Creo un decorador propio con class.validator

import { IsDate, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { IsAfter } from '../../common/decorators/isAfter.decorator';

export class CreateBookingDto {
  @IsNumber()
  roomId: number;

  @Type(() => Date)
  @IsDate()
  checkInDate: Date;

  @Type(() => Date)
  @IsDate()
  @IsAfter('checkInDate', { message: 'checkOutDate must be after checkInDate' })
  checkOutDate: Date;
}
