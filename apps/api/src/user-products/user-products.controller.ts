import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt-auth.guard';
import { CreateUserProductDto } from './dto/create-user-product.dto';
import { UpdateUserProductDto } from './dto/update-user-product.dto';
import { UserProductsService } from './user-products.service';

@Controller('user-products')
@UseGuards(JwtAuthGuard)
export class UserProductsController {
  constructor(private readonly userProducts: UserProductsService) {}

  @Get()
  list(@Req() req: Request) {
    const { sub } = req['user'] as JwtPayload;
    return this.userProducts.list(sub);
  }

  @Post()
  create(@Req() req: Request, @Body() dto: CreateUserProductDto) {
    const { sub } = req['user'] as JwtPayload;
    return this.userProducts.create(sub, dto);
  }

  @Patch(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateUserProductDto) {
    const { sub } = req['user'] as JwtPayload;
    return this.userProducts.update(sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: Request, @Param('id') id: string) {
    const { sub } = req['user'] as JwtPayload;
    return this.userProducts.remove(sub, id);
  }
}
