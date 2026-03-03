import 'reflect-metadata';
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { WarrantyExpiryScheduler } from './warranty-expiry.scheduler';

const DAY_MS = 24 * 60 * 60 * 1000;

function makeWarranty(overrides: Record<string, unknown> = {}) {
  return {
    id: 'w-1',
    type: 'manufacturer',
    endDate: new Date(Date.now() + 20 * DAY_MS), // 20 days from now
    lastAlertedAt: null,
    ...overrides,
  };
}

function makeUser(warranties = [makeWarranty()], overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'test@example.com',
    notificationPref: { daysBeforeExpiry: 30 },
    userProducts: [
      {
        product: { brand: 'Samsung', model: 'TV55' },
        warranties,
      },
    ],
    ...overrides,
  };
}

function makeMocks(users: ReturnType<typeof makeUser>[] = [makeUser()]) {
  return {
    prisma: {
      user: {
        findMany: mock.fn(async () => users),
      },
      warranty: {
        update: mock.fn(async () => ({})),
      },
    },
    email: {
      sendWarrantyExpiryAlert: mock.fn(async () => {}),
    },
  };
}

function makeScheduler(mocks: ReturnType<typeof makeMocks>) {
  return new WarrantyExpiryScheduler(mocks.prisma as any, mocks.email as any);
}

test('sends email when warranty expires within alert window', async () => {
  const endDate = new Date(Date.now() + 20 * DAY_MS); // 20 days from now (within 30-day default window)
  const mocks = makeMocks([makeUser([makeWarranty({ endDate })])]);
  const scheduler = makeScheduler(mocks);

  await scheduler.checkExpiringWarranties();

  assert.equal(mocks.email.sendWarrantyExpiryAlert.mock.calls.length, 1);
  assert.equal(mocks.prisma.warranty.update.mock.calls.length, 1);
});

test('skips warranty that expires beyond the alert window', async () => {
  const endDate = new Date(Date.now() + 60 * DAY_MS); // 60 days from now (outside 30-day default window)
  const mocks = makeMocks([makeUser([makeWarranty({ endDate })])]);
  const scheduler = makeScheduler(mocks);

  await scheduler.checkExpiringWarranties();

  assert.equal(mocks.email.sendWarrantyExpiryAlert.mock.calls.length, 0);
});

test('skips already-expired warranty', async () => {
  const endDate = new Date(Date.now() - 1 * DAY_MS); // yesterday
  const mocks = makeMocks([makeUser([makeWarranty({ endDate })])]);
  const scheduler = makeScheduler(mocks);

  await scheduler.checkExpiringWarranties();

  assert.equal(mocks.email.sendWarrantyExpiryAlert.mock.calls.length, 0);
});

test('skips warranty alerted within the last 24 hours', async () => {
  const endDate = new Date(Date.now() + 20 * DAY_MS);
  const lastAlertedAt = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12 hours ago
  const mocks = makeMocks([makeUser([makeWarranty({ endDate, lastAlertedAt })])]);
  const scheduler = makeScheduler(mocks);

  await scheduler.checkExpiringWarranties();

  assert.equal(mocks.email.sendWarrantyExpiryAlert.mock.calls.length, 0);
});

test('sends email when last alert was more than 24 hours ago', async () => {
  const endDate = new Date(Date.now() + 20 * DAY_MS);
  const lastAlertedAt = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
  const mocks = makeMocks([makeUser([makeWarranty({ endDate, lastAlertedAt })])]);
  const scheduler = makeScheduler(mocks);

  await scheduler.checkExpiringWarranties();

  assert.equal(mocks.email.sendWarrantyExpiryAlert.mock.calls.length, 1);
});

test('respects custom daysBeforeExpiry preference', async () => {
  const endDate = new Date(Date.now() + 45 * DAY_MS); // 45 days — outside default 30-day window
  const user = makeUser([makeWarranty({ endDate })], {
    notificationPref: { daysBeforeExpiry: 60 }, // custom 60-day window
  });
  const mocks = makeMocks([user]);
  const scheduler = makeScheduler(mocks);

  await scheduler.checkExpiringWarranties();

  assert.equal(mocks.email.sendWarrantyExpiryAlert.mock.calls.length, 1);
});

test('sends no emails when no users have email notifications enabled (empty query result)', async () => {
  const mocks = makeMocks([]); // prisma returns empty (emailEnabled=false users filtered out)
  const scheduler = makeScheduler(mocks);

  await scheduler.checkExpiringWarranties();

  assert.equal(mocks.email.sendWarrantyExpiryAlert.mock.calls.length, 0);
});

test('sends no emails when user has no matching warranties (alertEnabled=false filtered out)', async () => {
  const user = makeUser([]); // empty warranties (alertEnabled=false ones filtered by prisma query)
  const mocks = makeMocks([user]);
  const scheduler = makeScheduler(mocks);

  await scheduler.checkExpiringWarranties();

  assert.equal(mocks.email.sendWarrantyExpiryAlert.mock.calls.length, 0);
});

test('updates lastAlertedAt on the warranty after sending alert', async () => {
  const endDate = new Date(Date.now() + 20 * DAY_MS);
  const mocks = makeMocks([makeUser([makeWarranty({ id: 'w-target', endDate })])]);
  const scheduler = makeScheduler(mocks);

  await scheduler.checkExpiringWarranties();

  const updateCall = mocks.prisma.warranty.update.mock.calls[0];
  assert.equal(updateCall.arguments[0].where.id, 'w-target');
  assert.ok(updateCall.arguments[0].data.lastAlertedAt instanceof Date);
});

test('sends multiple emails for multiple expiring warranties', async () => {
  const user = makeUser([
    makeWarranty({ id: 'w-1', endDate: new Date(Date.now() + 10 * DAY_MS) }),
    makeWarranty({ id: 'w-2', endDate: new Date(Date.now() + 20 * DAY_MS) }),
  ]);
  const mocks = makeMocks([user]);
  const scheduler = makeScheduler(mocks);

  await scheduler.checkExpiringWarranties();

  assert.equal(mocks.email.sendWarrantyExpiryAlert.mock.calls.length, 2);
  assert.equal(mocks.prisma.warranty.update.mock.calls.length, 2);
});

test('includes correct product name and days left in email payload', async () => {
  const endDate = new Date(Date.now() + 15 * DAY_MS);
  const user = makeUser([makeWarranty({ endDate })]);
  const mocks = makeMocks([user]);
  const scheduler = makeScheduler(mocks);

  await scheduler.checkExpiringWarranties();

  const emailCall = mocks.email.sendWarrantyExpiryAlert.mock.calls[0];
  const payload = emailCall.arguments[0] as Record<string, unknown>;
  assert.equal(payload.to, 'test@example.com');
  assert.equal(payload.productName, 'Samsung TV55');
  assert.equal(payload.warrantyType, 'manufacturer');
  assert.ok(typeof payload.daysLeft === 'number' && (payload.daysLeft as number) > 0);
});
