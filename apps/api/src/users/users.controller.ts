import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@Req() req: Request) {
    const { sub } = req['user'] as JwtPayload;
    return this.users.findById(sub);
  }

  @Patch('me')
  updateMe(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    const { sub } = req['user'] as JwtPayload;
    return this.users.updateProfile(sub, dto);
  }
}
