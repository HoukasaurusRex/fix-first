import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import { PrismaModule } from './prisma.module';
import { PrismaService } from './prisma.service';

test('PrismaModule provides PrismaService', async () => {
  const module = await Test.createTestingModule({
    imports: [PrismaModule],
  }).compile();

  const service = module.get(PrismaService);
  assert.ok(service != null, 'PrismaService should be injectable');
});
