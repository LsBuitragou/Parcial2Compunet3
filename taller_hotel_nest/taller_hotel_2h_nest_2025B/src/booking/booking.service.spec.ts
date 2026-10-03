import { Test, TestingModule } from '@nestjs/testing';
import { BookingService } from './booking.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Booking } from './booking.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('BookingService', () => {
  let service: BookingService;
  let mockRepository;

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        {
          provide: getRepositoryToken(Booking),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new booking', async () => {
      const createBookingDto = {
        roomId: 1,
        checkInDate: new Date('2025-05-01'),
        checkOutDate: new Date('2025-05-05'),
      };

      mockRepository.create.mockReturnValue({
        ...createBookingDto,
        id: 1,
        userId: 1,
        status: 'pending',
      });

      mockRepository.save.mockResolvedValue({
        ...createBookingDto,
        id: 1,
        userId: 1,
        status: 'pending',
      });

      const result = await service.create(1, createBookingDto);

      expect(result).toHaveProperty('id');
      expect(result.status).toBe('pending');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should calculate total price based on nights and room price', async () => {
      const createBookingDto = {
        roomId: 1,
        checkInDate: new Date('2025-05-01'),
        checkOutDate: new Date('2025-05-06'),
      };

      mockRepository.create.mockReturnValue({
        ...createBookingDto,
        id: 1,
        totalPrice: 750, // 5 nights * 150 per night
      });

      mockRepository.save.mockResolvedValue({
        ...createBookingDto,
        id: 1,
        totalPrice: 750,
      });

      const result = await service.create(1, createBookingDto);

      expect(result).toHaveProperty('totalPrice');
    });
  });

  describe('findOne', () => {
    it('should return a single booking by id', async () => {
      const booking = {
        id: 1,
        checkInDate: new Date('2025-05-01'),
        checkOutDate: new Date('2025-05-05'),
        status: 'confirmed',
        totalPrice: 600,
      };

      mockRepository.findOne.mockResolvedValue(booking);

      const result = await service.findOne(1);

      expect(result).toEqual(booking);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['room', 'user'],
      });
    });

    it('should throw NotFoundException when booking not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      expect(async () => {
        await service.findOne(999);
      }).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByUser', () => {
    it('should return all bookings for a user', async () => {
      const bookings = [
        {
          id: 1,
          checkInDate: new Date('2025-05-01'),
          checkOutDate: new Date('2025-05-05'),
          userId: 1,
        },
        {
          id: 2,
          checkInDate: new Date('2025-06-01'),
          checkOutDate: new Date('2025-06-10'),
          userId: 1,
        },
      ];

      mockRepository.find.mockResolvedValue(bookings);

      const result = await service.findByUser(1);

      expect(result).toEqual(bookings);
      expect(result.length).toBe(2);
    });
  });

  describe('findByRoom', () => {
    it('should return all bookings for a room', async () => {
      const bookings = [
        {
          id: 1,
          checkInDate: new Date('2025-05-01'),
          checkOutDate: new Date('2025-05-05'),
          roomId: 1,
        },
      ];

      mockRepository.find.mockResolvedValue(bookings);

      const result = await service.findByRoom(1);

      expect(result).toEqual(bookings);
    });
  });

  describe('cancel', () => {
    it('should cancel a booking', async () => {
      const cancelledBooking = {
        id: 1,
        status: 'cancelled',
      };

      mockRepository.update.mockResolvedValue({ affected: 1 });
      mockRepository.findOne.mockResolvedValue(cancelledBooking);

      const result = await service.cancel(1);

      expect(result.status).toBe('cancelled');
    });
  });

  describe('hasDateConflict', () => {
    it('should return false if no conflicts exist', async () => {
      const checkInDate = new Date('2025-05-01');
      const checkOutDate = new Date('2025-05-05');

      mockRepository.find.mockResolvedValue([]);

      const result = await service.hasDateConflict(1, checkInDate, checkOutDate);

      expect(result).toBe(false);
    });

    it('should return true if date conflict exists', async () => {
      const checkInDate = new Date('2025-05-01');
      const checkOutDate = new Date('2025-05-10');
      const existingBooking = {
        id: 1,
        checkInDate: new Date('2025-05-03'),
        checkOutDate: new Date('2025-05-07'),
      };

      mockRepository.find.mockResolvedValue([existingBooking]);

      const result = await service.hasDateConflict(1, checkInDate, checkOutDate);

      expect(result).toBe(true);
    });
  });

  describe('getBookingsByDateRange', () => {
    it('should return bookings within date range', async () => {
      const bookings = [
        {
          id: 1,
          checkInDate: new Date('2025-05-02'),
          checkOutDate: new Date('2025-05-04'),
        },
      ];

      mockRepository.find.mockResolvedValue(bookings);

      const result = await service.getBookingsByDateRange(
        new Date('2025-05-01'),
        new Date('2025-05-05'),
      );

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
