import 'reflect-metadata';
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { NotFoundException } from '@nestjs/common';
import { JurisdictionsService } from './jurisdictions.service';

function makeMocks() {
  return {
    prisma: {
      jurisdiction: {
        findMany: mock.fn(async () => []),
        findUnique: mock.fn(async () => null),
      },
    },
  };
}

function makeService(prisma: ReturnType<typeof makeMocks>['prisma']) {
  return new JurisdictionsService(prisma as any);
}

const FEDERAL = {
  id: 'j-ca',
  code: 'CA',
  name: 'Canada (Federal)',
  country: 'CA',
  isProvincial: false,
  createdAt: new Date(),
  laws: [
    {
      id: 'l-ca-1',
      jurisdictionId: 'j-ca',
      statute: 'Competition Act',
      summary: 'Federal competition law.',
      productCategory: null,
      effectiveDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
};

const ONTARIO = {
  id: 'j-on',
  code: 'ON',
  name: 'Ontario',
  country: 'CA',
  isProvincial: true,
  createdAt: new Date(),
  laws: [
    {
      id: 'l-on-1',
      jurisdictionId: 'j-on',
      statute: 'Consumer Protection Act, 2002',
      summary: 'Ontario consumer protection.',
      productCategory: null,
      effectiveDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'l-on-2',
      jurisdictionId: 'j-on',
      statute: 'Electronics CPA amendment',
      summary: 'Electronics specific rule.',
      productCategory: 'electronics',
      effectiveDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
};

test('list returns all jurisdictions', async () => {
  const { prisma } = makeMocks();
  prisma.jurisdiction.findMany.mock.mockImplementation(async () => [FEDERAL, ONTARIO]);
  const service = makeService(prisma);
  const result = await service.list();
  assert.equal(result.length, 2);
});

test('findApplicableLaws returns provincial + federal laws merged', async () => {
  const { prisma } = makeMocks();
  prisma.jurisdiction.findUnique.mock.mockImplementation(async ({ where }: { where: { code: string } }) => {
    if (where.code === 'ON') return ONTARIO;
    if (where.code === 'CA') return FEDERAL;
    return null;
  });
  const service = makeService(prisma);
  const result = await service.findApplicableLaws('ON');
  // Federal (1) + provincial (2) = 3
  assert.equal(result.laws.length, 3);
  assert.equal(result.jurisdiction.code, 'ON');
});

test('findApplicableLaws filters by category', async () => {
  const { prisma } = makeMocks();
  prisma.jurisdiction.findUnique.mock.mockImplementation(async ({ where }: { where: { code: string } }) => {
    if (where.code === 'ON') return ONTARIO;
    if (where.code === 'CA') return FEDERAL;
    return null;
  });
  const service = makeService(prisma);
  const result = await service.findApplicableLaws('ON', 'electronics');
  // Universal laws (null category) + electronics-specific = CA + l-on-1 + l-on-2 = 3
  assert.equal(result.laws.length, 3);
  assert.ok(result.laws.some((l) => l.statute === 'Electronics CPA amendment'));
  assert.ok(result.laws.some((l) => l.statute === 'Competition Act'));
});

test('findApplicableLaws excludes laws for other categories', async () => {
  const { prisma } = makeMocks();
  prisma.jurisdiction.findUnique.mock.mockImplementation(async ({ where }: { where: { code: string } }) => {
    if (where.code === 'ON') return ONTARIO;
    if (where.code === 'CA') return FEDERAL;
    return null;
  });
  const service = makeService(prisma);
  const result = await service.findApplicableLaws('ON', 'furniture');
  // l-on-2 is electronics-only, excluded; federal + l-on-1 (no category) = 2
  assert.equal(result.laws.length, 2);
  assert.ok(!result.laws.some((l) => l.statute === 'Electronics CPA amendment'));
});

test('findApplicableLaws throws NotFoundException for unknown code', async () => {
  const { prisma } = makeMocks();
  prisma.jurisdiction.findUnique.mock.mockImplementation(async () => null);
  const service = makeService(prisma);
  await assert.rejects(() => service.findApplicableLaws('XX'), NotFoundException);
});

test('findApplicableLaws is case-insensitive on code', async () => {
  const { prisma } = makeMocks();
  prisma.jurisdiction.findUnique.mock.mockImplementation(async ({ where }: { where: { code: string } }) => {
    if (where.code === 'ON') return ONTARIO;
    if (where.code === 'CA') return FEDERAL;
    return null;
  });
  const service = makeService(prisma);
  const result = await service.findApplicableLaws('on');
  assert.equal(result.jurisdiction.code, 'ON');
});
