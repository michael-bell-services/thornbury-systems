import { test } from 'node:test';
import assert from 'node:assert/strict';
import { totalFor, lineTotal, outstandingFor, vatRateFor } from '../src/invoices/calc.ts';
import { invoices, type Invoice } from '../src/db.ts';

const byId = (id: string): Invoice => invoices.find((i) => i.id === id)!;

test('line totals multiply quantity by unit price', () => {
  assert.equal(lineTotal({ description: 'x', quantity: 41, unitPence: 218, kind: 'SUPPLY' }), 8938);
});

test('metered supply is zero rated, engineer work is standard rated', () => {
  assert.equal(vatRateFor({ description: 'Metered supply', quantity: 1, unitPence: 100, kind: 'SUPPLY' }), 0);
  assert.equal(vatRateFor({ description: 'Backflow test', quantity: 1, unitPence: 100, kind: 'SERVICE' }), 20);
});

test('every invoice totals to net plus VAT', () => {
  for (const invoice of invoices) {
    const { net, vat, total } = totalFor(invoice);
    assert.equal(total, net + vat, `${invoice.id} should total net plus VAT`);
    assert.ok(vat >= 0, `${invoice.id} should not carry negative VAT`);
  }
});

test('a mixed invoice charges VAT on the service line only', () => {
  // INV-9002: 218400 + 9600 supply, 17000 backflow test. VAT on the test alone.
  assert.deepEqual(totalFor(byId('INV-9002')), { net: 245000, vat: 3400, total: 248400 });
});

test('a domestic call out is charged VAT', () => {
  // INV-9003: 7194 + 2400 supply, 14000 emergency call out.
  assert.deepEqual(totalFor(byId('INV-9003')), { net: 23594, vat: 2800, total: 26394 });
});

test('an invoice that is all supply carries no VAT', () => {
  assert.deepEqual(totalFor(byId('INV-9004')), { net: 563400, vat: 0, total: 563400 });
});

test('VAT does not depend on the customer being VAT registered', () => {
  // C-1002 is registered and C-1003 is not. Both pay 20% on engineer work.
  assert.equal(totalFor(byId('INV-9002')).vat, 3400);
  assert.equal(totalFor(byId('INV-9003')).vat, 2800);
});

test('outstanding balance ignores paid invoices', () => {
  assert.equal(outstandingFor('C-1001', invoices), 0);
});

test('outstanding balance includes VAT', () => {
  assert.equal(outstandingFor('C-1002', invoices), 248400);
  assert.equal(outstandingFor('C-1003', invoices), 26394);
});

test('legacy paper invoices carry the postage surcharge, and it is not vatable', () => {
  const paper: Invoice = {
    id: 'INV-0001',
    customerId: 'C-1001',
    issued: '2018-03-01',
    source: 'LEGACY_PAPER',
    paid: true,
    lines: [{ description: 'Metered supply', quantity: 10, unitPence: 100, kind: 'SUPPLY' }],
  };
  assert.deepEqual(totalFor(paper), { net: 1150, vat: 0, total: 1150 });
});
