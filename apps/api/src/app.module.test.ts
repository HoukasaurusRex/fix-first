import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';

test('AppModule compiles without errors', async () => {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  assert.ok(module, 'module should be defined');
});
