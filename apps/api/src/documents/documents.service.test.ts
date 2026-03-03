import 'reflect-metadata';
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { DocumentsService } from './documents.service';

const FAKE_SHA256 = 'a'.repeat(64);
const FAKE_S3_KEY = `documents/global/${FAKE_SHA256}.pdf`;

function makeMocks(existingDoc: Record<string, unknown> | null = null) {
  return {
    prisma: {
      document: {
        findUnique: mock.fn(async () => existingDoc),
        findUniqueOrThrow: mock.fn(async () => existingDoc ?? { id: 'doc-1', s3Key: FAKE_S3_KEY }),
        findMany: mock.fn(async () => []),
        upsert: mock.fn(async (_args: unknown) => ({
          id: 'doc-1',
          sha256: FAKE_SHA256,
          s3Key: FAKE_S3_KEY,
          filename: 'manual.pdf',
          type: 'manual',
          sizeBytes: 1024,
          createdAt: new Date('2024-01-01'),
          product: null,
        })),
      },
    },
    storage: {
      documentKey: mock.fn((_hash: string, ext: string) => `documents/global/${_hash}.${ext}`),
      presignedPutUrl: mock.fn(async () => 'https://s3.example.com/put-url'),
      presignedGetUrl: mock.fn(async () => 'https://s3.example.com/get-url'),
    },
  };
}

function makeService(mocks: ReturnType<typeof makeMocks>) {
  return new DocumentsService(mocks.prisma as any, mocks.storage as any);
}

// ---------------------------------------------------------------------------
// check()

test('check: returns existing documentId when sha256 matches', async () => {
  const mocks = makeMocks({ id: 'doc-existing', s3Key: FAKE_S3_KEY });
  const service = makeService(mocks);

  const result = await service.check(FAKE_SHA256, 'manual.pdf', 'application/pdf');

  assert.deepEqual(result, { exists: true, documentId: 'doc-existing' });
  assert.equal(mocks.storage.presignedPutUrl.mock.calls.length, 0);
});

test('check: returns presigned upload URL when document does not exist', async () => {
  const mocks = makeMocks(null);
  const service = makeService(mocks);

  const result = await service.check(FAKE_SHA256, 'manual.pdf', 'application/pdf') as {
    exists: false;
    uploadUrl: string;
    s3Key: string;
  };

  assert.equal(result.exists, false);
  assert.equal(result.uploadUrl, 'https://s3.example.com/put-url');
  assert.ok(result.s3Key.endsWith('.pdf'));
});

test('check: derives extension from filename', async () => {
  const mocks = makeMocks(null);
  const service = makeService(mocks);

  await service.check(FAKE_SHA256, 'warranty.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

  const [hash, ext] = mocks.storage.documentKey.mock.calls[0].arguments as [string, string];
  assert.equal(hash, FAKE_SHA256);
  assert.equal(ext, 'docx');
});

test('check: uses full filename as extension when filename has no dot', async () => {
  const mocks = makeMocks(null);
  const service = makeService(mocks);

  await service.check(FAKE_SHA256, 'noextension', 'application/octet-stream');

  // split('.').pop() on 'noextension' returns 'noextension' (no dot → whole string)
  const [, ext] = mocks.storage.documentKey.mock.calls[0].arguments as [string, string];
  assert.equal(ext, 'noextension');
});

// ---------------------------------------------------------------------------
// confirmUpload()

test('confirmUpload: upserts document and returns summary', async () => {
  const mocks = makeMocks(null);
  const service = makeService(mocks);

  const result = await service.confirmUpload('user-1', {
    sha256: FAKE_SHA256,
    s3Key: FAKE_S3_KEY,
    filename: 'manual.pdf',
    sizeBytes: 1024,
    type: 'manual',
    contentType: 'application/pdf',
    productId: undefined,
  });

  assert.equal(result.id, 'doc-1');
  assert.equal(result.type, 'manual');
  assert.equal(result.filename, 'manual.pdf');
  assert.equal(result.sizeBytes, 1024);
  assert.equal(result.uploadedBy, 'community');
  assert.equal(mocks.prisma.document.upsert.mock.calls.length, 1);
});

test('confirmUpload: upsert uses sha256 as unique key (dedup)', async () => {
  const mocks = makeMocks(null);
  const service = makeService(mocks);

  await service.confirmUpload('user-1', {
    sha256: FAKE_SHA256,
    s3Key: FAKE_S3_KEY,
    filename: 'manual.pdf',
    sizeBytes: 1024,
    type: 'manual',
    contentType: 'application/pdf',
  });

  const upsertArgs = mocks.prisma.document.upsert.mock.calls[0].arguments[0] as {
    where: { sha256: string };
    update: Record<string, unknown>;
  };
  assert.equal(upsertArgs.where.sha256, FAKE_SHA256);
  assert.deepEqual(upsertArgs.update, {}); // no-op on duplicate
});

test('confirmUpload: links document to product when productId provided', async () => {
  const mocks = makeMocks(null);
  const service = makeService(mocks);

  await service.confirmUpload('user-1', {
    sha256: FAKE_SHA256,
    s3Key: FAKE_S3_KEY,
    filename: 'manual.pdf',
    sizeBytes: 1024,
    type: 'manual',
    contentType: 'application/pdf',
    productId: 'product-abc',
  });

  const upsertArgs = mocks.prisma.document.upsert.mock.calls[0].arguments[0] as {
    create: { productId: string | null };
  };
  assert.equal(upsertArgs.create.productId, 'product-abc');
});

// ---------------------------------------------------------------------------
// getDownloadUrl()

test('getDownloadUrl: returns presigned GET URL for document', async () => {
  const mocks = makeMocks({ id: 'doc-1', s3Key: FAKE_S3_KEY });
  const service = makeService(mocks);

  const url = await service.getDownloadUrl('doc-1');

  assert.equal(url, 'https://s3.example.com/get-url');
  assert.equal(mocks.storage.presignedGetUrl.mock.calls.length, 1);
  assert.equal(
    (mocks.storage.presignedGetUrl.mock.calls[0].arguments as unknown[])[0],
    FAKE_S3_KEY,
  );
});

// ---------------------------------------------------------------------------
// findForProduct() / findAll()

test('findForProduct: queries documents by productId', async () => {
  const mocks = makeMocks(null);
  const service = makeService(mocks);

  await service.findForProduct('product-xyz');

  const findManyArgs = mocks.prisma.document.findMany.mock.calls[0].arguments[0] as {
    where: { productId: string };
  };
  assert.equal(findManyArgs.where.productId, 'product-xyz');
});

test('findAll: returns all documents ordered by createdAt desc', async () => {
  const mocks = makeMocks(null);
  const service = makeService(mocks);

  await service.findAll();

  const findManyArgs = mocks.prisma.document.findMany.mock.calls[0].arguments[0] as {
    orderBy: { createdAt: string };
  };
  assert.equal(findManyArgs.orderBy.createdAt, 'desc');
});
