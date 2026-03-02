import 'reflect-metadata';
import { describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { StorageService } from './storage.service';

// Build a minimal StorageService with a mocked S3 client and config
function makeService(overrides: Record<string, string> = {}) {
  const defaults = { AWS_REGION: 'ca-central-1', AWS_S3_BUCKET: 'test-bucket', ...overrides };
  const config = { getOrThrow: mock.fn((key: string) => defaults[key] ?? '') };

  // Bypass the real S3Client constructor by injecting a fake after construction
  const service = new StorageService(config as any);

  const fakeClient = {
    send: mock.fn(async () => ({})),
  };
  // @ts-expect-error – replace private field for testing
  service['client'] = fakeClient;

  return { service, fakeClient };
}

describe('StorageService', async () => {
  test('sha256 returns correct hex digest', () => {
    const { service } = makeService();
    const buf = Buffer.from('hello');
    // Known SHA-256 of "hello"
    assert.equal(
      service.sha256(buf),
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    );
  });

  test('receiptKey formats path as receipts/{userId}/{hash}.{ext}', () => {
    const { service } = makeService();
    const key = service.receiptKey('user-1', 'abc123', 'jpg');
    assert.equal(key, 'receipts/user-1/abc123.jpg');
  });

  test('documentKey formats path as documents/global/{hash}.{ext}', () => {
    const { service } = makeService();
    const key = service.documentKey('def456', 'pdf');
    assert.equal(key, 'documents/global/def456.pdf');
  });

  test('upload calls S3 client send with PutObjectCommand', async () => {
    const { service, fakeClient } = makeService();
    const buf = Buffer.from('test content');

    await service.upload('receipts/user-1/test.jpg', buf, 'image/jpeg');

    assert.equal(fakeClient.send.mock.calls.length, 1);
  });

  test('delete calls S3 client send with DeleteObjectCommand', async () => {
    const { service, fakeClient } = makeService();

    await service.delete('receipts/user-1/test.jpg');

    assert.equal(fakeClient.send.mock.calls.length, 1);
  });
});
