import { Test, TestingModule } from '@nestjs/testing';
import { HotelService } from './hotel.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Hotel } from './hotel.entity';
import { NotFoundException } from '@nestjs/common';

describe('HotelService', () => {
  let service: HotelService;
  let mockRepository;

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HotelService,
        {
          provide: getRepositoryToken(Hotel),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<HotelService>(HotelService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new hotel', async () => {
      const createHotelDto = {
        name: 'Grand Hotel',
        location: 'Downtown',
        city: 'New York',
        country: 'USA',
        rating: 4.5,
        description: 'A luxury hotel',
      };

      mockRepository.create.mockReturnValue({
        ...createHotelDto,
        id: 1,
      });

      mockRepository.save.mockResolvedValue({
        ...createHotelDto,
        id: 1,
      });

      const result = await service.create(createHotelDto);

      expect(result).toHaveProperty('id');
      expect(result.name).toBe(createHotelDto.name);
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return an array of hotels', async () => {
      const hotels = [
        {
          id: 1,
          name: 'Grand Hotel',
          location: 'Downtown',
          city: 'New York',
          country: 'USA',
          rating: 4.5,
        },
        {
          id: 2,
          name: 'Luxury Resort',
          location: 'Beach',
          city: 'Miami',
          country: 'USA',
          rating: 4.8,
        },
      ];

      mockRepository.find.mockResolvedValue(hotels);

      const result = await service.findAll();

      expect(result).toEqual(hotels);
      expect(mockRepository.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single hotel by id', async () => {
      const hotel = {
        id: 1,
        name: 'Grand Hotel',
        location: 'Downtown',
        city: 'New York',
        country: 'USA',
        rating: 4.5,
      };

      mockRepository.findOne.mockResolvedValue(hotel);

      const result = await service.findOne(1);

      expect(result).toEqual(hotel);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['rooms'],
      });
    });

    it('should throw NotFoundException when hotel not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      expect(async () => {
        await service.findOne(999);
      }).rejects.toThrow(NotFoundException);
    });
  });

  describe('searchByLocation', () => {
    it('should return hotels by location', async () => {
      const hotels = [
        {
          id: 1,
          name: 'Grand Hotel',
          location: 'Downtown',
          city: 'New York',
        },
      ];

      mockRepository.find.mockResolvedValue(hotels);

      const result = await service.searchByLocation('Downtown');

      expect(result).toEqual(hotels);
    });

    it('should return empty array when no hotels found in location', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.searchByLocation('NonExistent');

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update a hotel', async () => {
      const updateData = { name: 'Updated Hotel', rating: 4.9 };
      const updatedHotel = { id: 1, ...updateData };

      mockRepository.update.mockResolvedValue({ affected: 1 });
      mockRepository.findOne.mockResolvedValue(updatedHotel);

      const result = await service.update(1, updateData);

      expect(result.name).toBe('Updated Hotel');
      expect(result.rating).toBe(4.9);
    });
  });

  describe('delete', () => {
    it('should delete a hotel', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await service.delete(1);

      expect(result).toBe(true);
      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('getAvailableHotels', () => {
    it('should return hotels with available rooms', async () => {
      const hotels = [
        {
          id: 1,
          name: 'Grand Hotel',
          rooms: [{ id: 1, available: true }],
        },
      ];

      mockRepository.find.mockResolvedValue(hotels);

      const result = await service.getAvailableHotels();

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
