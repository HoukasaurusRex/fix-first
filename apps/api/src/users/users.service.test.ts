import 'reflect-metadata';
import { beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

function makeMocks() {
  const prisma = {
    user: {
      findUnique: mock.fn(),
      update: mock.fn(),
    },
  };
  return { prisma };
}

const SAMPLE_USER = {
  id: 'user-1',
  email: 'alice@example.com',
  name: 'Alice',
  province: 'ON',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('UsersService', async () => {
  let service: UsersService;
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
    service = new UsersService(mocks.prisma as any);
  });

  test('findById returns user without password', async () => {
    mocks.prisma.user.findUnique.mock.mockImplementation(() => SAMPLE_USER);

    const result = await service.findById('user-1');

    assert.equal(result.id, 'user-1');
    assert.equal(result.email, 'alice@example.com');
    assert.ok(!('password' in result), 'password should not be returned');
  });

  test('findById throws NotFoundException for unknown id', async () => {
    mocks.prisma.user.findUnique.mock.mockImplementation(() => null);

    await assert.rejects(() => service.findById('unknown'), NotFoundException);
  });

  test('findByEmail returns null for unknown email', async () => {
    mocks.prisma.user.findUnique.mock.mockImplementation(() => null);

    const result = await service.findByEmail('nobody@example.com');

    assert.equal(result, null);
  });

  test('updateProfile updates name successfully', async () => {
    const updated = { ...SAMPLE_USER, name: 'Alicia' };
    mocks.prisma.user.update.mock.mockImplementation(() => updated);

    const result = await service.updateProfile('user-1', { name: 'Alicia' });

    assert.equal(result.name, 'Alicia');
    assert.equal(mocks.prisma.user.update.mock.calls.length, 1);
  });

  test('updateProfile normalises province to uppercase', async () => {
    const updated = { ...SAMPLE_USER, province: 'BC' };
    mocks.prisma.user.update.mock.mockImplementation(() => updated);

    await service.updateProfile('user-1', { province: 'bc' });

    const callArg = mocks.prisma.user.update.mock.calls[0].arguments[0] as any;
    assert.equal(callArg.data.province, 'BC');
  });

  test('updateProfile throws BadRequestException for invalid province', async () => {
    await assert.rejects(
      () => service.updateProfile('user-1', { province: 'ZZ' }),
      BadRequestException,
    );
  });

  test('updateProfile with no fields does not update DB', async () => {
    mocks.prisma.user.update.mock.mockImplementation(() => SAMPLE_USER);

    await service.updateProfile('user-1', {});

    const callArg = mocks.prisma.user.update.mock.calls[0].arguments[0] as any;
    assert.deepEqual(callArg.data, {});
  });
});
