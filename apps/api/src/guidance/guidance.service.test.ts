import 'reflect-metadata';
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GuidanceService } from './guidance.service';

const PRODUCT = { id: 'prod-1', brand: 'Samsung', model: 'TV55', category: 'electronics', createdAt: new Date() };

function makeBaseUp(overrides: Record<string, unknown> = {}) {
  return {
    id: 'up-1',
    userId: 'user-1',
    productId: 'prod-1',
    purchasedAt: new Date(Date.now() - 2 * 365.25 * 24 * 60 * 60 * 1000), // 2 years ago
    retailer: null,
    price: null,
    createdAt: new Date(),
    product: PRODUCT,
    warranties: [],
    ...overrides,
  };
}

function makeMocks(up: ReturnType<typeof makeBaseUp> | null = makeBaseUp()) {
  return {
    prisma: {
      userProduct: {
        findUnique: mock.fn(async () => up),
      },
      receipt: {
        count: mock.fn(async () => 0),
      },
    },
  };
}

function makeService(prisma: ReturnType<typeof makeMocks>['prisma']) {
  return new GuidanceService(prisma as any);
}

// ------ Checklist ------

test('getChecklist returns all checklist items', async () => {
  const { prisma } = makeMocks();
  const service = makeService(prisma);
  const items = await service.getChecklist('user-1', 'up-1');
  assert.ok(items.length >= 5);
  const keys = items.map((i) => i.key);
  assert.ok(keys.includes('manufacturer_warranty'));
  assert.ok(keys.includes('statutory_protection'));
  assert.ok(keys.includes('proof_of_purchase'));
  assert.ok(keys.includes('recall_check'));
});

test('getChecklist marks manufacturer warranty as checked when active', async () => {
  const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const up = makeBaseUp({
    warranties: [{ id: 'w-1', type: 'manufacturer', endDate: future }],
  });
  const { prisma } = makeMocks(up);
  const service = makeService(prisma);
  const items = await service.getChecklist('user-1', 'up-1');
  const mfr = items.find((i) => i.key === 'manufacturer_warranty')!;
  assert.equal(mfr.status, 'checked');
});

test('getChecklist marks manufacturer warranty unchecked when expired', async () => {
  const past = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  const up = makeBaseUp({
    warranties: [{ id: 'w-1', type: 'manufacturer', endDate: past }],
  });
  const { prisma } = makeMocks(up);
  const service = makeService(prisma);
  const items = await service.getChecklist('user-1', 'up-1');
  const mfr = items.find((i) => i.key === 'manufacturer_warranty')!;
  assert.equal(mfr.status, 'unchecked');
});

test('getChecklist marks proof of purchase checked when receipt exists', async () => {
  const { prisma } = makeMocks();
  prisma.receipt.count.mock.mockImplementation(async () => 1);
  const service = makeService(prisma);
  const items = await service.getChecklist('user-1', 'up-1');
  const pop = items.find((i) => i.key === 'proof_of_purchase')!;
  assert.equal(pop.status, 'checked');
});

test('getChecklist throws NotFoundException for missing product', async () => {
  const { prisma } = makeMocks(null);
  const service = makeService(prisma);
  await assert.rejects(() => service.getChecklist('user-1', 'up-999'), NotFoundException);
});

test('getChecklist throws ForbiddenException for wrong user', async () => {
  const up = makeBaseUp({ userId: 'other-user' });
  const { prisma } = makeMocks(up);
  const service = makeService(prisma);
  await assert.rejects(() => service.getChecklist('user-1', 'up-1'), ForbiddenException);
});

// ------ Repair or Replace ------

test('getRepairOrReplace returns check_warranty when active warranty exists', async () => {
  const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const up = makeBaseUp({
    warranties: [{ id: 'w-1', type: 'manufacturer', endDate: future }],
  });
  const { prisma } = makeMocks(up);
  const service = makeService(prisma);
  const result = await service.getRepairOrReplace('user-1', 'up-1');
  assert.equal(result.recommendation, 'check_warranty');
  assert.equal(result.warrantyStatus, 'active');
});

test('getRepairOrReplace returns repair when product < 1 year old and no warranty', async () => {
  const recentPurchase = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000); // 6 months ago
  const up = makeBaseUp({ purchasedAt: recentPurchase, warranties: [] });
  const { prisma } = makeMocks(up);
  const service = makeService(prisma);
  const result = await service.getRepairOrReplace('user-1', 'up-1');
  assert.equal(result.recommendation, 'repair');
});

test('getRepairOrReplace returns replace when product > 5 years old and no warranty', async () => {
  const oldPurchase = new Date(Date.now() - 6 * 365.25 * 24 * 60 * 60 * 1000); // 6 years ago
  const up = makeBaseUp({ purchasedAt: oldPurchase, warranties: [] });
  const { prisma } = makeMocks(up);
  const service = makeService(prisma);
  const result = await service.getRepairOrReplace('user-1', 'up-1');
  assert.equal(result.recommendation, 'replace');
});

test('getRepairOrReplace returns check_warranty for statutory warranty', async () => {
  const up = makeBaseUp({
    warranties: [{ id: 'w-1', type: 'statutory', endDate: null }],
  });
  const { prisma } = makeMocks(up);
  const service = makeService(prisma);
  const result = await service.getRepairOrReplace('user-1', 'up-1');
  assert.equal(result.recommendation, 'check_warranty');
});

// ------ Resources ------

test('getResources returns electronics resources for electronics category', () => {
  const { prisma } = makeMocks();
  const service = makeService(prisma);
  const resources = service.getResources('electronics');
  assert.ok(resources.length > 0);
  assert.ok(resources.some((r) => r.url.includes('ifixit') || r.label.toLowerCase().includes('repair')));
});

test('getResources returns default resources for unknown category', () => {
  const { prisma } = makeMocks();
  const service = makeService(prisma);
  const resources = service.getResources('furniture');
  assert.ok(resources.length > 0);
});

test('getResources returns default resources when no category provided', () => {
  const { prisma } = makeMocks();
  const service = makeService(prisma);
  const resources = service.getResources();
  assert.ok(resources.length > 0);
});
