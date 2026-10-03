/*eslint-disable*/
import { Injectable, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from './room.entity';
import { CreateRoomDto } from './dto/create-room.dto';

@Injectable()
export class RoomService {
  constructor(
    @InjectRepository(Room)
    private roomsRepository: Repository<Room>,
  ) {}

  async create(hotelId: number, createRoomDto: CreateRoomDto): Promise<Room> {
    const room = this.roomsRepository.create({
      ...createRoomDto,
      hotel: { id: hotelId },
    });

    return this.roomsRepository.save(room);
  }

  async findAll(hotelId: number): Promise<Room[]> {
    return this.roomsRepository.find({
      where: { hotel: { id: hotelId } },
    });
  }

  async findOne(id: number): Promise<Room> {
    const room = await this.roomsRepository.findOne({
      where: { id },
      relations: ['hotel', 'bookings'],
    });

    if (!room) {
      throw new NotFoundException(`Room with id ${id} not found`);
    }

    return room;
  }

  /*async update(id: number, updateData: Partial<CreateRoomDto>): Promise<Room> {
    const room = await this.roomsRepository.findOne({ 
      where:{
        id: id
      }
    });

    if (room==undefined || room==null) {
      throw new NotFoundException(`Room con ID ${id} no fue encontrado`);
    }

    const roomModificado = Object.assign(room, updateData);

    return await this.roomsRepository.save(roomModificado);
  }*/

    async update(id: number, updateData: Partial<CreateRoomDto>): Promise<Room> {
      // 1) Actualizamos directamente en la base de datos
      await this.roomsRepository.update(id, updateData);
    
      // 2) Buscamos el hotel ya actualizado
      const room = await this.roomsRepository.findOne({
        where: { id },
      });
    
      // 3) Si no existe, lanzamos el error
      if (room === undefined || room === null) {
        throw new NotFoundException(`Room con ID ${id} no fue encontrado`);
      }
    
      // 4) Retornamos el hotel actualizado
      return room;
    }

  async delete(id: number): Promise<boolean> {
    const result = await this.roomsRepository.delete(id);
  
    if(result.affected === null || result.affected === undefined){
      throw new BadRequestException('hotel not found');
    }
      // Retorna true si eliminó 1 o más filas, de lo contrario false
      return result.affected > 0;
    }
  
  async getAvailability(hotelId: number): Promise<Room[]> {
    return await this.roomsRepository.find({
      where: {
        hotel: { id: hotelId },
        available: true,
      },
    });
  }

  async isAvailableForDateRange(
    roomId: number,
    checkInDate: Date,
    checkOutDate: Date,
  ): Promise<boolean> {
    const room = await this.roomsRepository.findOne({
      where: { id: roomId },
      relations: ['bookings'],
    });

    if (room === undefined || room === null) {
      throw new NotFoundException(`Room con ID ${roomId} no fue encontrado`);
    }

    const bookings = room.bookings ?? [];

    // Hay choque si la reserva empieza antes de que termine mi rango
    // Y termina después de que empiece mi rango
    const hasOverlap = bookings.some(
      (booking) =>
        new Date(booking.checkInDate) < checkOutDate &&
        new Date(booking.checkOutDate) > checkInDate,
    );

    return !hasOverlap;
  }
}
