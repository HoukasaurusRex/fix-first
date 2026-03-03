import 'reflect-metadata';
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
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
      statute: 'Competition Act, R.S.C. 1985',
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

const QUEBEC = {
  id: 'j-qc',
  code: 'QC',
  name: 'Quebec',
  country: 'CA',
  isProvincial: true,
  createdAt: new Date(),
  laws: [
    {
      id: 'l-qc-1',
      jurisdictionId: 'j-qc',
      statute: 'Loi sur la protection du consommateur',
      summary: 'Quebec legal warranty applies to all consumer goods.',
      productCategory: null,
      effectiveDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'l-qc-2',
      jurisdictionId: 'j-qc',
      statute: 'Civil Code of Quebec — latent defects',
      summary: 'Warranty against latent defects.',
      productCategory: null,
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

test('findApplicableLaws QC + electronics returns at least 2 laws (federal + QC)', async () => {
  const { prisma } = makeMocks();
  prisma.jurisdiction.findUnique.mock.mockImplementation(async ({ where }: { where: { code: string } }) => {
    if (where.code === 'QC') return QUEBEC;
    if (where.code === 'CA') return FEDERAL;
    return null;
  });
  const service = makeService(prisma);
  const result = await service.findApplicableLaws('QC', 'electronics');
  // Federal (null, universal) + QC-1 (null, universal) + QC-2 (null, universal) = 3
  assert.ok(result.laws.length >= 2, `expected >= 2 laws, got ${result.laws.length}`);
  assert.equal(result.jurisdiction.code, 'QC');
});

test('findApplicableLaws ON + appliance includes federal and provincial laws', async () => {
  const { prisma } = makeMocks();
  prisma.jurisdiction.findUnique.mock.mockImplementation(async ({ where }: { where: { code: string } }) => {
    if (where.code === 'ON') return ONTARIO;
    if (where.code === 'CA') return FEDERAL;
    return null;
  });
  const service = makeService(prisma);
  const result = await service.findApplicableLaws('ON', 'appliance');
  // Universal laws only (electronics law excluded): federal + l-on-1 = 2
  assert.ok(result.laws.length >= 1, `expected >= 1 law, got ${result.laws.length}`);
  assert.ok(result.laws.some((l) => l.statute.includes('Competition Act')));
  assert.ok(result.laws.some((l) => l.statute === 'Consumer Protection Act, 2002'));
});

test('findApplicableLaws filters by category — universal laws always included', async () => {
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
  assert.ok(result.laws.some((l) => l.statute.includes('Competition Act')));
});

test('findApplicableLaws excludes laws for non-matching categories', async () => {
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

test('findApplicableLaws returns empty array for unknown province code', async () => {
  const { prisma } = makeMocks();
  prisma.jurisdiction.findUnique.mock.mockImplementation(async () => null);
  const service = makeService(prisma);
  const result = await service.findApplicableLaws('XX');
  // Should return empty array, not throw
  assert.equal(result.laws.length, 0);
  assert.equal(result.jurisdiction.code, 'XX');
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
