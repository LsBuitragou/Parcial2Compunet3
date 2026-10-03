/*eslint-disable*/
import { Controller, Post, Get, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { RoomService } from './room.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { Room } from './room.entity';

@Controller('hotels/:hotelId/rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  async createRoom(
    @Param('hotelId') hotelId: string,
    @Body() createRoomDto: CreateRoomDto,
  ): Promise<Room> {
    return this.roomService.create(parseInt(hotelId), createRoomDto);
  }

  @Get()
  async getAllRooms(@Param('hotelId') hotelId: string): Promise<Room[]> {
    return this.roomService.findAll(parseInt(hotelId));
  }

  @Get(':id')
  async getRoom(@Param('id') id: string): Promise<Room> {
    return this.roomService.findOne(parseInt(id));
  }

  @Put(':id')
  async updateRoom(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateRoomDto>,
  ): Promise<Room> {
    return this.roomService.update(parseInt(id), updateData);
  }

  @Delete(':id')
  async deleteRoom(@Param('id') id: string): Promise<{ success: boolean }> {
     if ((await this.roomService.delete(parseInt(id)))){
      return {
      success : true
    };
    }

    return {
      success : false
    };
  }
}
