import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { parseReceiptFields } from './receipt-parser';

describe('parseReceiptFields', async () => {
  test('extracts YYYY-MM-DD date', () => {
    const result = parseReceiptFields('Best Buy\n2024-03-15\nTotal $299.99');
    assert.equal(result.purchaseDate, '2024-03-15');
  });

  test('extracts MM/DD/YYYY date', () => {
    const result = parseReceiptFields('Costco\n03/15/2024\nTotal $49.99');
    assert.equal(result.purchaseDate, '2024-03-15');
  });

  test('extracts DD Mon YYYY date', () => {
    const result = parseReceiptFields('Home Depot\n15 Mar 2024\nTotal $89.95');
    assert.equal(result.purchaseDate, '2024-03-15');
  });

  test('extracts Mon DD, YYYY date', () => {
    const result = parseReceiptFields('Canadian Tire\nMar 15, 2024\nTotal $149.00');
    assert.equal(result.purchaseDate, '2024-03-15');
  });

  test('returns null purchaseDate when no date found', () => {
    const result = parseReceiptFields('No date here at all');
    assert.equal(result.purchaseDate, null);
  });

  test('extracts largest price as the total', () => {
    const result = parseReceiptFields('Tax $12.50\nSubtotal $199.00\nTotal $211.50');
    assert.equal(result.price, 211.50);
  });

  test('returns null price when no price found', () => {
    const result = parseReceiptFields('Receipt without any dollar amounts');
    assert.equal(result.price, null);
  });

  test('extracts retailer from first meaningful line', () => {
    const result = parseReceiptFields('Best Buy Canada\n2024-03-15\nDyson V15 $599.99\nTotal $599.99');
    assert.equal(result.retailer, 'Best Buy Canada');
  });

  test('detects visa payment method', () => {
    const result = parseReceiptFields('Store\nTotal $99.99\nPaid by VISA ending 1234');
    assert.equal(result.paymentMethod, 'visa');
  });

  test('detects interac payment method', () => {
    const result = parseReceiptFields('Store\nTotal $99.99\nInterac Debit');
    assert.equal(result.paymentMethod, 'interac');
  });

  test('detects cash payment method', () => {
    const result = parseReceiptFields('Store\nTotal $99.99\nCash Tendered $100.00');
    assert.equal(result.paymentMethod, 'cash');
  });

  test('returns null paymentMethod when none found', () => {
    const result = parseReceiptFields('Store\nTotal $99.99');
    assert.equal(result.paymentMethod, null);
  });

  test('all fields null for empty text', () => {
    const result = parseReceiptFields('');
    assert.equal(result.purchaseDate, null);
    assert.equal(result.retailer, null);
    assert.equal(result.price, null);
    assert.equal(result.paymentMethod, null);
  });
});
