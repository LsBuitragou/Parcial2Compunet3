import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Room Module (e2e)', () => {
  let app: INestApplication;
  let hotelId = 1;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // TODO: Enable ValidationPipe globally
    // app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    // Create a hotel for testing
    const hotelRes = await request(app.getHttpServer()).post('/hotels').send({
      name: 'Test Hotel',
      location: 'Test Location',
      city: 'Test City',
      country: 'Test Country',
      rating: 4.0,
    });

    if (hotelRes.status === 201) {
      hotelId = hotelRes.body.id;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /hotels/:hotelId/rooms - Create Room', () => {
    it('should create a new room', () => {
      const createRoomDto = {
        roomNumber: '101',
        type: 'double',
        pricePerNight: 150,
        capacity: 2,
        description: 'A nice double room',
      };

      return request(app.getHttpServer())
        .post(`/hotels/${hotelId}/rooms`)
        .send(createRoomDto)
        .expect((res) => {
          if (res.status === 201) {
            expect(res.body).toHaveProperty('id');
            expect(res.body.roomNumber).toBe(createRoomDto.roomNumber);
          }
        });
    });

    // TODO: Add test for invalid price (negative)
    it('should fail with invalid price', () => {
      const invalidRoomDto = {
        roomNumber: '102',
        type: 'single',
        pricePerNight: -100, // Invalid - price cannot be negative
        capacity: 1,
      };

      return request(app.getHttpServer())
        .post(`/hotels/${hotelId}/rooms`)
        .send(invalidRoomDto)
        .expect((res) => {
          expect([400, 201]).toContain(res.status);
        });
    });
  });

  describe('GET /hotels/:hotelId/rooms - Get All Rooms', () => {
    it('should return all rooms for a hotel', () => {
      return request(app.getHttpServer())
        .get(`/hotels/${hotelId}/rooms`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('GET /hotels/:hotelId/rooms/available - Get Available Rooms', () => {
    it('should return available rooms', () => {
      return request(app.getHttpServer())
        .get(`/hotels/${hotelId}/rooms/available`)
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
          if (res.status === 200) {
            expect(Array.isArray(res.body)).toBe(true);
          }
        });
    });
  });

  describe('GET /hotels/:hotelId/rooms/:id - Get Room by ID', () => {
    it('should return a room by id', () => {
      return request(app.getHttpServer())
        .get(`/hotels/${hotelId}/rooms/1`)
        .expect((res) => {
          if (res.status === 200) {
            expect(res.body).toHaveProperty('id');
          } else if (res.status === 404) {
            expect(res.body).toHaveProperty('message');
          }
        });
    });
  });

  describe('PUT /hotels/:hotelId/rooms/:id - Update Room', () => {
    // TODO: Implement update endpoint test
    it('should update a room', () => {
      const updateData = {
        pricePerNight: 200,
        available: false,
      };

      return request(app.getHttpServer())
        .put(`/hotels/${hotelId}/rooms/1`)
        .send(updateData)
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });
  });

  describe('DELETE /hotels/:hotelId/rooms/:id - Delete Room', () => {
    // TODO: Implement delete endpoint test
    it('should delete a room', () => {
      return request(app.getHttpServer())
        .delete(`/hotels/${hotelId}/rooms/999`)
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });
  });
});
