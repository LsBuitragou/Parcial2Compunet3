import { Test, TestingModule } from '@nestjs/testing';
import { RoomService } from './room.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Room } from './room.entity';
import { NotFoundException } from '@nestjs/common';

describe('RoomService', () => {
  let service: RoomService;
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
        RoomService,
        {
          provide: getRepositoryToken(Room),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<RoomService>(RoomService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new room', async () => {
      const createRoomDto = {
        roomNumber: '101',
        type: 'double',
        pricePerNight: 150,
        capacity: 2,
        description: 'A nice double room',
      };

      mockRepository.create.mockReturnValue({
        ...createRoomDto,
        id: 1,
        hotelId: 1,
      });

      mockRepository.save.mockResolvedValue({
        ...createRoomDto,
        id: 1,
        hotelId: 1,
      });

      const result = await service.create(1, createRoomDto);

      expect(result).toHaveProperty('id');
      expect(result.roomNumber).toBe(createRoomDto.roomNumber);
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return an array of rooms for a hotel', async () => {
      const rooms = [
        {
          id: 1,
          roomNumber: '101',
          type: 'double',
          pricePerNight: 150,
          capacity: 2,
          hotelId: 1,
        },
        {
          id: 2,
          roomNumber: '102',
          type: 'single',
          pricePerNight: 100,
          capacity: 1,
          hotelId: 1,
        },
      ];

      mockRepository.find.mockResolvedValue(rooms);

      const result = await service.findAll(1);

      expect(result).toEqual(rooms);
      expect(mockRepository.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single room by id', async () => {
      const room = {
        id: 1,
        roomNumber: '101',
        type: 'double',
        pricePerNight: 150,
        capacity: 2,
      };

      mockRepository.findOne.mockResolvedValue(room);

      const result = await service.findOne(1);

      expect(result).toEqual(room);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['hotel', 'bookings'],
      });
    });

    it('should throw NotFoundException when room not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      expect(async () => {
        await service.findOne(999);
      }).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAvailability', () => {
    it('should return available rooms for a hotel', async () => {
      const availableRooms = [
        {
          id: 1,
          roomNumber: '101',
          available: true,
          hotelId: 1,
        },
        {
          id: 2,
          roomNumber: '102',
          available: true,
          hotelId: 1,
        },
      ];

      mockRepository.find.mockResolvedValue(availableRooms);

      const result = await service.getAvailability(1);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('update', () => {
    it('should update a room', async () => {
      const updateData = { pricePerNight: 200, available: false };
      const updatedRoom = { id: 1, ...updateData };

      mockRepository.update.mockResolvedValue({ affected: 1 });
      mockRepository.findOne.mockResolvedValue(updatedRoom);

      const result = await service.update(1, updateData);

      expect(result.pricePerNight).toBe(200);
      expect(result.available).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete a room', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await service.delete(1);

      expect(result).toBe(true);
      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('isAvailableForDateRange', () => {
    it('should return true if room is available for date range', async () => {
      const startDate = new Date('2025-05-01');
      const endDate = new Date('2025-05-05');

      // Mock implementation would check bookings
      mockRepository.findOne.mockResolvedValue({
        id: 1,
        bookings: [],
      });

      const result = await service.isAvailableForDateRange(
        1,
        startDate,
        endDate,
      );

      expect(result).toBeDefined();
    });
  });
});
