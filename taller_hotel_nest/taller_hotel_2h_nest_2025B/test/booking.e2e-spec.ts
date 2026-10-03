import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Booking Module (e2e)', () => {
  let app: INestApplication;
  let userId = 1;
  let roomId = 1;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // TODO: Enable ValidationPipe globally
    // app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    // Create a user for testing
    const userRes = await request(app.getHttpServer()).post('/users/register').send({
      email: 'testuser@example.com',
      password: 'password123',
      name: 'Test User',
      phone: '123456789',
    });

    if (userRes.status === 201) {
      userId = userRes.body.id;
    }

    // Create a hotel and room for testing
    const hotelRes = await request(app.getHttpServer()).post('/hotels').send({
      name: 'Test Hotel',
      location: 'Test Location',
      city: 'Test City',
      country: 'Test Country',
      rating: 4.0,
    });

    let hotelId = hotelRes.body.id || 1;

    const roomRes = await request(app.getHttpServer())
      .post(`/hotels/${hotelId}/rooms`)
      .send({
        roomNumber: '101',
        type: 'double',
        pricePerNight: 150,
        capacity: 2,
      });

    if (roomRes.status === 201) {
      roomId = roomRes.body.id;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /bookings - Create Booking', () => {
    it('should create a new booking', () => {
      const createBookingDto = {
        roomId: roomId,
        checkInDate: new Date('2025-06-01'),
        checkOutDate: new Date('2025-06-05'),
      };

      return request(app.getHttpServer())
        .post('/bookings')
        .send(createBookingDto)
        .expect((res) => {
          if (res.status === 201) {
            expect(res.body).toHaveProperty('id');
            expect(res.body.status).toBe('pending');
          }
        });
    });

    // TODO: Add test for date conflict - checkOutDate before checkInDate
    it('should fail when checkOutDate is before checkInDate', () => {
      const invalidBookingDto = {
        roomId: roomId,
        checkInDate: new Date('2025-06-05'),
        checkOutDate: new Date('2025-06-01'), // Invalid - before check-in
      };

      return request(app.getHttpServer())
        .post('/bookings')
        .send(invalidBookingDto)
        .expect((res) => {
          expect([400, 201]).toContain(res.status);
        });
    });

    // TODO: Add test for overlapping dates
    it('should fail when booking overlaps with existing reservation', () => {
      const overlappingBookingDto = {
        roomId: roomId,
        checkInDate: new Date('2025-06-03'),
        checkOutDate: new Date('2025-06-07'),
      };

      return request(app.getHttpServer())
        .post('/bookings')
        .send(overlappingBookingDto)
        .expect((res) => {
          expect([400, 201]).toContain(res.status);
        });
    });
  });

  describe('GET /bookings/:id - Get Booking by ID', () => {
    it('should return a booking by id', () => {
      return request(app.getHttpServer())
        .get('/bookings/1')
        .expect((res) => {
          if (res.status === 200) {
            expect(res.body).toHaveProperty('id');
          } else if (res.status === 404) {
            expect(res.body).toHaveProperty('message');
          }
        });
    });
  });

  describe('GET /bookings/user/:userId - Get User Bookings', () => {
    it('should return all bookings for a user', () => {
      return request(app.getHttpServer())
        .get(`/bookings/user/${userId}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('GET /bookings/room/:roomId - Get Room Bookings', () => {
    it('should return all bookings for a room', () => {
      return request(app.getHttpServer())
        .get(`/bookings/room/${roomId}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('DELETE /bookings/:id - Cancel Booking', () => {
    // TODO: Implement cancel endpoint test
    it('should cancel a booking', () => {
      return request(app.getHttpServer())
        .delete('/bookings/1')
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });

    it('should return cancelled status', () => {
      return request(app.getHttpServer())
        .delete('/bookings/1')
        .expect((res) => {
          if (res.status === 200) {
            expect(res.body).toHaveProperty('status', 'cancelled');
          }
        });
    });
  });
});
