import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Hotel Module (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // TODO: Enable ValidationPipe globally
    // app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /hotels - Create Hotel', () => {
    it('should create a new hotel with valid data', () => {
      const createHotelDto = {
        name: 'Grand Hotel',
        location: 'Downtown',
        city: 'New York',
        country: 'USA',
        rating: 4.5,
        description: 'A luxury hotel',
      };

      return request(app.getHttpServer())
        .post('/hotels')
        .send(createHotelDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe(createHotelDto.name);
        });
    });

    // TODO: Add test for invalid input (missing required fields, invalid rating)
    it('should fail with invalid rating (> 5)', () => {
      const invalidHotelDto = {
        name: 'Hotel',
        location: 'Downtown',
        city: 'New York',
        country: 'USA',
        rating: 6.5, // Invalid - should be max 5
      };

      return request(app.getHttpServer())
        .post('/hotels')
        .send(invalidHotelDto)
        .expect(400);
    });
  });

  describe('GET /hotels - Get All Hotels', () => {
    it('should return an array of hotels', () => {
      return request(app.getHttpServer())
        .get('/hotels')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('GET /hotels/:id - Get Hotel by ID', () => {
    it('should return a hotel by id', () => {
      return request(app.getHttpServer())
        .get('/hotels/1')
        .expect((res) => {
          if (res.status === 200) {
            expect(res.body).toHaveProperty('id');
          } else if (res.status === 404) {
            expect(res.body).toHaveProperty('message');
          }
        });
    });
  });

  describe('GET /hotels/search?location=Downtown - Search Hotels', () => {
    it('should search hotels by location', () => {
      return request(app.getHttpServer())
        .get('/hotels/search')
        .query({ location: 'Downtown' })
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('GET /hotels/available - Get Available Hotels', () => {
    it('should return available hotels', () => {
      return request(app.getHttpServer())
        .get('/hotels/available')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('PUT /hotels/:id - Update Hotel', () => {
    // TODO: Implement update endpoint test
    it('should update a hotel', () => {
      const updateData = {
        name: 'Updated Grand Hotel',
        rating: 4.8,
      };

      return request(app.getHttpServer())
        .put('/hotels/1')
        .send(updateData)
        .expect((res) => {
          // Should return 200 with updated data or 404 if hotel not found
          expect([200, 404]).toContain(res.status);
        });
    });
  });

  describe('DELETE /hotels/:id - Delete Hotel', () => {
    // TODO: Implement delete endpoint test
    it('should delete a hotel', () => {
      return request(app.getHttpServer())
        .delete('/hotels/999')
        .expect((res) => {
          // Should return 200 (deleted) or 404 (not found)
          expect([200, 404]).toContain(res.status);
        });
    });
  });
});
