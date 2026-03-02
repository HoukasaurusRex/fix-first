import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as sharedTypes from './index';

test('shared-types package exports without errors', () => {
  assert.ok(sharedTypes !== undefined);
});
