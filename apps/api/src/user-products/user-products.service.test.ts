import 'reflect-metadata';
import { beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserProductsService } from './user-products.service';

function makeMocks() {
  const prisma = {
    userProduct: {
      findMany: mock.fn(),
      create: mock.fn(),
      update: mock.fn(),
      delete: mock.fn(),
      findUnique: mock.fn(),
    },
    user: {
      findUnique: mock.fn(async () => null),
    },
    warranty: {
      create: mock.fn(async () => ({})),
    },
  };
  const jurisdictions = {
    findApplicableLaws: mock.fn(async () => ({ laws: [], jurisdiction: { code: 'ON', name: 'Ontario' } })),
  };
  return { prisma, jurisdictions };
}

const SAMPLE_PRODUCT = { id: 'prod-1', brand: 'Dyson', model: 'V15', category: 'Electronics', createdAt: new Date() };

const SAMPLE_UP = {
  id: 'up-1',
  userId: 'user-1',
  productId: 'prod-1',
  purchasedAt: null,
  retailer: 'Best Buy',
  price: null,
  createdAt: new Date(),
  product: SAMPLE_PRODUCT,
  warranties: [],
};

describe('UserProductsService', async () => {
  let service: UserProductsService;
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
    service = new UserProductsService(mocks.prisma as any, mocks.jurisdictions as any);
  });

  test('list returns user products', async () => {
    mocks.prisma.userProduct.findMany.mock.mockImplementation(() => [SAMPLE_UP]);
    const result = await service.list('user-1');
    assert.equal(result.length, 1);
    assert.equal(result[0].product.brand, 'Dyson');
  });

  test('create adds a product to the user collection', async () => {
    mocks.prisma.userProduct.create.mock.mockImplementation(() => SAMPLE_UP);
    mocks.prisma.userProduct.findUnique.mock.mockImplementation(() => SAMPLE_UP);
    const result = await service.create('user-1', { productId: 'prod-1', retailer: 'Best Buy' });
    assert.equal(result.id, 'up-1');
  });

  test('create auto-creates STATUTORY warranty when user has province', async () => {
    mocks.prisma.userProduct.create.mock.mockImplementation(() => SAMPLE_UP);
    mocks.prisma.userProduct.findUnique.mock.mockImplementation(() => SAMPLE_UP);
    mocks.prisma.user.findUnique.mock.mockImplementation(async () => ({ province: 'QC' }));
    mocks.jurisdictions.findApplicableLaws.mock.mockImplementation(async () => ({
      laws: [{ statute: 'Loi sur la protection du consommateur', summary: '...', productCategory: null }],
      jurisdiction: { code: 'QC', name: 'Quebec' },
    }));
    await service.create('user-1', { productId: 'prod-1' });
    assert.equal(mocks.prisma.warranty.create.mock.calls.length, 1);
    const warrantyData = (mocks.prisma.warranty.create.mock.calls[0].arguments as any[])[0].data;
    assert.equal(warrantyData.type, 'statutory');
    assert.match(warrantyData.notes, /Loi sur la protection du consommateur/);
  });

  test('create does not auto-create warranty when user has no province', async () => {
    mocks.prisma.userProduct.create.mock.mockImplementation(() => SAMPLE_UP);
    mocks.prisma.userProduct.findUnique.mock.mockImplementation(() => SAMPLE_UP);
    mocks.prisma.user.findUnique.mock.mockImplementation(async () => ({ province: null }));
    await service.create('user-1', { productId: 'prod-1' });
    assert.equal(mocks.prisma.warranty.create.mock.calls.length, 0);
  });

  test('create does not auto-create warranty when no applicable laws', async () => {
    mocks.prisma.userProduct.create.mock.mockImplementation(() => SAMPLE_UP);
    mocks.prisma.userProduct.findUnique.mock.mockImplementation(() => SAMPLE_UP);
    mocks.prisma.user.findUnique.mock.mockImplementation(async () => ({ province: 'YT' }));
    mocks.jurisdictions.findApplicableLaws.mock.mockImplementation(async () => ({
      laws: [],
      jurisdiction: { code: 'YT', name: 'Yukon' },
    }));
    await service.create('user-1', { productId: 'prod-1' });
    assert.equal(mocks.prisma.warranty.create.mock.calls.length, 0);
  });

  test('update patches purchase details for owner', async () => {
    mocks.prisma.userProduct.findUnique.mock.mockImplementation(() => ({ ...SAMPLE_UP }));
    mocks.prisma.userProduct.update.mock.mockImplementation(() => ({ ...SAMPLE_UP, retailer: 'Amazon' }));
    const result = await service.update('user-1', 'up-1', { retailer: 'Amazon' });
    assert.equal(result.retailer, 'Amazon');
  });

  test('update throws ForbiddenException for non-owner', async () => {
    mocks.prisma.userProduct.findUnique.mock.mockImplementation(() => ({ ...SAMPLE_UP, userId: 'other-user' }));
    await assert.rejects(() => service.update('user-1', 'up-1', { retailer: 'X' }), ForbiddenException);
  });

  test('remove deletes for owner', async () => {
    mocks.prisma.userProduct.findUnique.mock.mockImplementation(() => ({ ...SAMPLE_UP }));
    mocks.prisma.userProduct.delete.mock.mockImplementation(() => ({}));
    await service.remove('user-1', 'up-1');
    assert.equal(mocks.prisma.userProduct.delete.mock.calls.length, 1);
  });

  test('remove throws NotFoundException for missing id', async () => {
    mocks.prisma.userProduct.findUnique.mock.mockImplementation(() => null);
    await assert.rejects(() => service.remove('user-1', 'up-999'), NotFoundException);
  });

  test('remove throws ForbiddenException for non-owner', async () => {
    mocks.prisma.userProduct.findUnique.mock.mockImplementation(() => ({ ...SAMPLE_UP, userId: 'other-user' }));
    await assert.rejects(() => service.remove('user-1', 'up-1'), ForbiddenException);
  });
});
