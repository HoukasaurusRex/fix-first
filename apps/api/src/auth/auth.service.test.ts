import 'reflect-metadata';
import { beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { AuthService } from './auth.service';

// Note: esbuild (used by tsx) doesn't support emitDecoratorMetadata, so
// NestJS constructor injection can't be resolved at test time. Unit tests
// instantiate services directly instead of going through the DI container.

const scryptAsync = promisify(scrypt);

async function makeStoredPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}

function makeMocks() {
  const prisma = {
    user: { findUnique: mock.fn(), findUniqueOrThrow: mock.fn(), create: mock.fn() },
    refreshToken: { findUnique: mock.fn(), create: mock.fn(), update: mock.fn(), updateMany: mock.fn() },
  };
  const jwt = { sign: mock.fn(() => 'access-token') };
  const config = {
    getOrThrow: mock.fn(() => 'test-secret'),
    get: mock.fn((_k: string, fallback: string) => fallback),
  };
  return { prisma, jwt, config };
}

describe('AuthService', async () => {
  let service: AuthService;
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
    service = new AuthService(mocks.prisma as any, mocks.jwt as any, mocks.config as any);
  });

  test('register creates a user and returns tokens', async () => {
    mocks.prisma.user.findUnique.mock.mockImplementation(() => null);
    mocks.prisma.user.create.mock.mockImplementation(() => ({
      id: 'user-1',
      email: 'alice@example.com',
      createdAt: new Date(),
    }));
    mocks.prisma.refreshToken.create.mock.mockImplementation(() => ({}));

    const result = await service.register({ email: 'alice@example.com', password: 'password123' });

    assert.ok(result.accessToken, 'accessToken should be set');
    assert.ok(result.refreshToken, 'refreshToken should be set');
    assert.equal(result.user.email, 'alice@example.com');
  });

  test('register throws ConflictException when email is taken', async () => {
    mocks.prisma.user.findUnique.mock.mockImplementation(() => ({
      id: 'x', email: 'alice@example.com',
    }));

    await assert.rejects(
      () => service.register({ email: 'alice@example.com', password: 'x' }),
      ConflictException,
    );
  });

  test('login returns tokens for valid credentials', async () => {
    const password = await makeStoredPassword('correct');
    mocks.prisma.user.findUnique.mock.mockImplementation(() => ({
      id: 'user-1', email: 'alice@example.com', password,
      createdAt: new Date(), updatedAt: new Date(),
    }));
    mocks.prisma.refreshToken.create.mock.mockImplementation(() => ({}));

    const result = await service.login({ email: 'alice@example.com', password: 'correct' });

    assert.ok(result.accessToken);
    assert.ok(result.refreshToken);
  });

  test('login throws UnauthorizedException for wrong password', async () => {
    const password = await makeStoredPassword('correct');
    mocks.prisma.user.findUnique.mock.mockImplementation(() => ({
      id: 'user-1', email: 'alice@example.com', password,
      createdAt: new Date(), updatedAt: new Date(),
    }));

    await assert.rejects(
      () => service.login({ email: 'alice@example.com', password: 'wrong' }),
      UnauthorizedException,
    );
  });

  test('login throws UnauthorizedException for unknown email', async () => {
    mocks.prisma.user.findUnique.mock.mockImplementation(() => null);

    await assert.rejects(
      () => service.login({ email: 'nobody@example.com', password: 'x' }),
      UnauthorizedException,
    );
  });

  test('logout revokes the refresh token', async () => {
    mocks.prisma.refreshToken.updateMany.mock.mockImplementation(() => ({ count: 1 }));

    await service.logout('some-raw-token');

    assert.equal(mocks.prisma.refreshToken.updateMany.mock.calls.length, 1);
  });
});
