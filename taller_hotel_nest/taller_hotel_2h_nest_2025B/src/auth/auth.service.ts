/* eslint-disable */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.userService.findOne(email);
    
    if (user && user.password === bcrypt.hash(pass, 10)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  // Método que genera el JWT token una vez autenticado
  async login(user: any) {
    const payload = { id: user.id, email: user.email }; // Lo que viaja dentro del token
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}