import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './user.entity';
import { ConflictException } from '@nestjs/common';

describe('UserService', () => {
  let service: UserService;
  let mockRepository;

  beforeEach(async () => {
    mockRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue({
        ...createUserDto,
        id: 1,
      });
      mockRepository.save.mockResolvedValue({
        ...createUserDto,
        id: 1,
      });

      const result = await service.create(createUserDto);

      expect(result).toHaveProperty('id');
      expect(result.email).toBe(createUserDto.email);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException when email already exists', async () => {
      const createUserDto = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
      };

      mockRepository.findOne.mockResolvedValue({ id: 1 });

      expect(async () => {
        await service.create(createUserDto);
      }).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should return a user by email', async () => {
      const user = { id: 1, email: 'test@example.com' };
      mockRepository.findOne.mockResolvedValue(user);

      const result = await service.findOne('test@example.com');

      expect(result).toEqual(user);
    });
  });

  describe('findById', () => {
    it('should return a user by id', async () => {
      const user = { id: 1, email: 'test@example.com' };
      mockRepository.findOne.mockResolvedValue(user);

      const result = await service.findById(1);

      expect(result).toEqual(user);
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const users = [
        { id: 1, email: 'user1@example.com' },
        { id: 2, email: 'user2@example.com' },
      ];
      mockRepository.find.mockResolvedValue(users);

      const result = await service.findAll();

      expect(result).toEqual(users);
      expect(mockRepository.find).toHaveBeenCalled();
    });
  });
});
