import 'reflect-metadata';
import { beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { WarrantiesService } from './warranties.service';

function makeMocks() {
  const prisma = {
    userProduct: { findUnique: mock.fn() },
    warranty: { create: mock.fn(), findMany: mock.fn() },
  };
  return { prisma };
}

const OWNER_UP = { id: 'up-1', userId: 'user-1' };

describe('WarrantiesService', async () => {
  let service: WarrantiesService;
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
    service = new WarrantiesService(mocks.prisma as any);
  });

  test('create stores a warranty for the owner', async () => {
    mocks.prisma.userProduct.findUnique.mock.mockImplementation(() => OWNER_UP);
    mocks.prisma.warranty.create.mock.mockImplementation(() => ({
      id: 'w-1', type: 'manufacturer',
    }));

    const result = await service.create('user-1', 'up-1', {
      type: 'manufacturer',
      startDate: '2024-01-01',
      endDate: '2026-01-01',
    });

    assert.equal(result.id, 'w-1');
  });

  test('create throws ForbiddenException for non-owner', async () => {
    mocks.prisma.userProduct.findUnique.mock.mockImplementation(() => ({ ...OWNER_UP, userId: 'other' }));

    await assert.rejects(
      () => service.create('user-1', 'up-1', { type: 'manufacturer', startDate: '2024-01-01' }),
      ForbiddenException,
    );
  });

  test('create throws NotFoundException for missing userProduct', async () => {
    mocks.prisma.userProduct.findUnique.mock.mockImplementation(() => null);

    await assert.rejects(
      () => service.create('user-1', 'up-999', { type: 'manufacturer', startDate: '2024-01-01' }),
      NotFoundException,
    );
  });

  test('isExpired returns false for lifetime type', () => {
    assert.equal(service.isExpired({ type: 'lifetime', endDate: new Date('2000-01-01') }), false);
  });

  test('isExpired returns false for statutory type', () => {
    assert.equal(service.isExpired({ type: 'statutory', endDate: null }), false);
  });

  test('isExpired returns true for expired manufacturer warranty', () => {
    assert.equal(service.isExpired({ type: 'manufacturer', endDate: new Date('2000-01-01') }), true);
  });

  test('isExpired returns false for active manufacturer warranty', () => {
    const future = new Date(Date.now() + 86_400_000);
    assert.equal(service.isExpired({ type: 'manufacturer', endDate: future }), false);
  });

  test('daysUntilExpiry returns null for lifetime type', () => {
    assert.equal(service.daysUntilExpiry({ type: 'lifetime', endDate: null }), null);
  });

  test('daysUntilExpiry returns null for statutory type', () => {
    assert.equal(service.daysUntilExpiry({ type: 'statutory', endDate: null }), null);
  });

  test('daysUntilExpiry returns a positive number for future expiry', () => {
    const future = new Date(Date.now() + 5 * 86_400_000);
    const result = service.daysUntilExpiry({ type: 'manufacturer', endDate: future });
    assert.ok(result !== null && result > 0);
  });

  test('findExpiring queries with correct cutoff', async () => {
    mocks.prisma.warranty.findMany.mock.mockImplementation(() => []);

    await service.findExpiring('user-1', 30);

    assert.equal(mocks.prisma.warranty.findMany.mock.calls.length, 1);
    const whereArg = mocks.prisma.warranty.findMany.mock.calls[0].arguments[0] as any;
    assert.ok(whereArg.where.endDate.lte instanceof Date);
  });
});
