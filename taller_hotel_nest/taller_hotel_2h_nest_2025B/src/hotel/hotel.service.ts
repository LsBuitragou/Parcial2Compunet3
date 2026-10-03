/*eslint-disable*/
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Equal, Repository } from 'typeorm';
import { Hotel } from './hotel.entity';
import { CreateHotelDto } from './dto/create-hotel.dto';

@Injectable()
export class HotelService {
  constructor(
    @InjectRepository(Hotel)
    private hotelsRepository: Repository<Hotel>,
  ) {}

  async create(createHotelDto: CreateHotelDto): Promise<Hotel> {
    const hotel = this.hotelsRepository.create(createHotelDto);
    return this.hotelsRepository.save(hotel);
  }

  async findAll(): Promise<Hotel[]> {
    return this.hotelsRepository.find({ relations: ['rooms'] });
  }

  async findOne(id: number): Promise<Hotel> {
    const hotel = await this.hotelsRepository.findOne({
      where: { id },
      relations: ['rooms'],
    });

    if (!hotel) {
      throw new NotFoundException(`Hotel with id ${id} not found`);
    }

    return hotel;
  }

  /*async update(id: number, updateData: Partial<CreateHotelDto>): Promise<Hotel> {
    const hotel = await this.hotelsRepository.findOne({
    where: { id },
    });

    if (hotel === undefined || hotel === null) {
      throw new NotFoundException(`Hotel con ID ${id} no fue encontrado`);
    }

    Object.assign(hotel, updateData);

    // Guardamos y retornamos
    return await this.hotelsRepository.save(hotel);
  }*/

    async update(id: number, updateData: Partial<CreateHotelDto>): Promise<Hotel> {
  // 1) Actualizamos directamente en la base de datos
  await this.hotelsRepository.update(id, updateData);

  // 2) Buscamos el hotel ya actualizado
  const hotel = await this.hotelsRepository.findOne({
    where: { id },
  });

  // 3) Si no existe, lanzamos el error
  if (hotel === undefined || hotel === null) {
    throw new NotFoundException(`Hotel con ID ${id} no fue encontrado`);
  }

  // 4) Retornamos el hotel actualizado
  return hotel;
}

  async delete(id: number): Promise<boolean> {
  const result = await this.hotelsRepository.delete(id);
  
  if(result.affected === null || result.affected === undefined){
    throw new BadRequestException('hotel not found');
  }
    // Retorna true si eliminó 1 o más filas, de lo contrario false
    return result.affected > 0;
  }

  async searchByLocation(location: string): Promise<Hotel[]> {
      return await this.hotelsRepository.find({
        where: {
          location: location ,
        },
      });
    }

  async getAvailableHotels(): Promise<Hotel[]> {
    return await this.hotelsRepository.find();
  }
}
