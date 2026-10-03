/* eslint-disable*/
import { Controller, Post, Get, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { HotelService } from './hotel.service';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { Hotel } from './hotel.entity';

@Controller('hotels')
export class HotelController {
  constructor(private readonly hotelService: HotelService) {}

  @Post()
  async createHotel(@Body() createHotelDto: CreateHotelDto): Promise<Hotel> {
    return this.hotelService.create(createHotelDto);
  }

  @Get()
  async getAllHotels(): Promise<Hotel[]> {
    return this.hotelService.findAll();
  }

  @Get(':id')
  async getHotel(@Param('id') id: string): Promise<Hotel> {
    return this.hotelService.findOne(parseInt(id));
  }

  @Put(':id')
  async updateHotel(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateHotelDto>,
  ): Promise<Hotel> {
    return this.hotelService.update(parseInt(id),updateData);
  }

  @Delete(':id')
  async deleteHotel(@Param('id') id: string): Promise<{ success: boolean }> {
    if ((await this.hotelService.delete(parseInt(id)))){
      return {
      success : true
    };
    }
    return {
      success : false
    };
  }
}  
