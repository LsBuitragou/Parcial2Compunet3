/* eslint-disable */
import { Controller, Post, Get, Body, Param, Delete, Request, UseGuards } from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Booking } from './booking.entity';
import { AuthGuard } from '@nestjs/passport';

@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async createBooking(
    @Request() req: any,
    @Body() createBookingDto: CreateBookingDto,
  ): Promise<Booking> {
    // In a real scenario, userId would come from JWT token in req.user
    const userId = req.user?.id || 1; // Default to 1 for testing
    return this.bookingService.create(userId, createBookingDto);
  }

  @Get(':id')
  async getBooking(@Param('id') id: string): Promise<Booking> {
    return this.bookingService.findOne(parseInt(id));
  }

  @Get('user/:userId')
  async getUserBookings(@Param('userId') userId: string): Promise<Booking[]> {
    return this.bookingService.findByUser(parseInt(userId));
  }

  @Get('room/:roomId')
  async getRoomBookings(@Param('roomId') roomId: string): Promise<Booking[]> {
    return this.bookingService.findByRoom(parseInt(roomId));
  }

  @Delete(':id')
  async cancelBooking(@Param('id') id: string): Promise<{ success: boolean }> {
    if ((await this.bookingService.cancel(parseInt(id))).status=='cancelled'){
      return {
      success : true
    };
    }
    return {
      success : false
    };
  }
}
