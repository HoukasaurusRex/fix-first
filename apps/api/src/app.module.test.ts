import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';

test('AppModule compiles without errors', async () => {
  // Provide required env vars consumed during module initialization
  process.env.JWT_ACCESS_SECRET = 'test-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  assert.ok(module, 'module should be defined');
});
