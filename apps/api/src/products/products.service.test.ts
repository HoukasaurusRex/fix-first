import 'reflect-metadata';
import { beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';

function makeMocks() {
  const prisma = {
    product: {
      findMany: mock.fn(),
      count: mock.fn(),
      findUnique: mock.fn(),
      create: mock.fn(),
      upsert: mock.fn(),
    },
  };
  return { prisma };
}

const SAMPLE_PRODUCT = {
  id: 'prod-1',
  brand: 'Dyson',
  model: 'V15',
  category: 'Electronics',
  createdAt: new Date(),
};

describe('ProductsService', async () => {
  let service: ProductsService;
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
    service = new ProductsService(mocks.prisma as any);
  });

  test('list returns paginated products', async () => {
    mocks.prisma.product.findMany.mock.mockImplementation(() => [SAMPLE_PRODUCT]);
    mocks.prisma.product.count.mock.mockImplementation(() => 1);

    const result = await service.list(1, 20);

    assert.equal(result.items.length, 1);
    assert.equal(result.total, 1);
    assert.equal(result.page, 1);
  });

  test('search filters by q and category', async () => {
    mocks.prisma.product.findMany.mock.mockImplementation(() => [SAMPLE_PRODUCT]);
    mocks.prisma.product.count.mock.mockImplementation(() => 1);

    const result = await service.search('dyson', 'electronics');

    assert.equal(result.items.length, 1);
    const whereArg = mocks.prisma.product.findMany.mock.calls[0].arguments[0] as any;
    assert.ok(whereArg.where.OR, 'should have OR clause for q filter');
    assert.ok(whereArg.where.category, 'should have category filter');
  });

  test('findById returns product for valid id', async () => {
    mocks.prisma.product.findUnique.mock.mockImplementation(() => SAMPLE_PRODUCT);

    const result = await service.findById('prod-1');

    assert.equal(result.id, 'prod-1');
  });

  test('findById throws NotFoundException for unknown id', async () => {
    mocks.prisma.product.findUnique.mock.mockImplementation(() => null);

    await assert.rejects(() => service.findById('unknown'), NotFoundException);
  });

  test('create creates and returns a product', async () => {
    mocks.prisma.product.findUnique.mock.mockImplementation(() => null);
    mocks.prisma.product.create.mock.mockImplementation(() => SAMPLE_PRODUCT);

    const result = await service.create({ brand: 'Dyson', model: 'V15', category: 'Electronics' });

    assert.equal(result.brand, 'Dyson');
  });

  test('create throws ConflictException for duplicate brand+model', async () => {
    mocks.prisma.product.findUnique.mock.mockImplementation(() => SAMPLE_PRODUCT);

    await assert.rejects(
      () => service.create({ brand: 'Dyson', model: 'V15', category: 'Electronics' }),
      ConflictException,
    );
  });

  test('findOrCreate upserts the product', async () => {
    mocks.prisma.product.upsert.mock.mockImplementation(() => SAMPLE_PRODUCT);

    const result = await service.findOrCreate({ brand: 'Dyson', model: 'V15', category: 'Electronics' });

    assert.equal(result.id, 'prod-1');
    assert.equal(mocks.prisma.product.upsert.mock.calls.length, 1);
  });
});
