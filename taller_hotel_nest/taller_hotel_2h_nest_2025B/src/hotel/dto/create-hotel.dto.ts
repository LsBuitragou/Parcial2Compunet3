/* eslint-disable */
import {
  IsNotEmpty,
  IsOptional,
  Min,
  Max
} from 'class-validator';

export class CreateHotelDto {
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  location: string;

  @IsNotEmpty()
  city: string;

  @IsNotEmpty()
  country: string;

  @IsNotEmpty()
  @Min(0)
  @Max(5)
  rating: number;

  @IsOptional()
  description?: string;
}
