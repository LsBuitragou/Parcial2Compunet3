
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  roomNumber: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['single', 'double', 'suite'])
  type: string; // 'single', 'double', 'suite'

  @IsNumber()
  @IsNotEmpty()
  @Min(0.01)
  pricePerNight: number;

  @IsInt()
  @IsNotEmpty()
  @Min(1)
  capacity: number;

  @IsOptional()
  @IsString()
  description?: string;
}
