import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statementFor } from '../src/invoices/statement.ts';
import { outstandingFor } from '../src/invoices/calc.ts';
import { customers, invoices, type Customer, type Invoice } from '../src/db.ts';

const trelawney = customers.find((c) => c.id === 'C-1002')!;
const academy = customers.find((c) => c.id === 'C-1004')!;

test('a statement lists the customer invoices with VAT broken out', () => {
  const statement = statementFor(trelawney, invoices);
  assert.equal(statement.customer.name, 'Trelawney Foods Ltd');
  assert.equal(statement.lines.length, 1);
  assert.deepEqual(statement.lines[0], {
    invoiceId: 'INV-9002',
    issued: '2026-07-01',
    net: 245000,
    vat: 3400,
    total: 248400,
    paid: false,
    displayNet: '£2,450.00',
    displayVat: '£34.00',
    displayTotal: '£2,484.00',
  });
});

test('totals separate what is paid from what is still owed', () => {
  const statement = statementFor(trelawney, invoices);
  assert.deepEqual(statement.totals, {
    invoiced: 248400,
    vat: 3400,
    paid: 0,
    outstanding: 248400,
    displayOutstanding: '£2,484.00',
  });
});

test('a paid invoice counts as invoiced but not as outstanding', () => {
  const statement = statementFor(academy, invoices);
  assert.equal(statement.totals.invoiced, 563400);
  assert.equal(statement.totals.paid, 563400);
  assert.equal(statement.totals.outstanding, 0);
});

test('invoiced is always paid plus outstanding', () => {
  for (const customer of customers) {
    const { totals } = statementFor(customer, invoices);
    assert.equal(totals.invoiced, totals.paid + totals.outstanding, customer.id);
  }
});

test('an unfiltered statement agrees with the balance the rest of the API reports', () => {
  for (const customer of customers) {
    const statement = statementFor(customer, invoices);
    assert.equal(
      statement.totals.outstanding,
      outstandingFor(customer.id, invoices),
      customer.id,
    );
  }
});

test('the period reports the span the statement covers', () => {
  assert.deepEqual(statementFor(academy, invoices).period, {
    from: '2026-04-01',
    to: '2026-04-01',
  });
});

test('a from date narrows the statement', () => {
  const statement = statementFor(academy, invoices, '2026-07-01');
  assert.equal(statement.lines.length, 0);
  assert.equal(statement.totals.invoiced, 0);
});

test('an invoice issued on the boundary is included', () => {
  const statement = statementFor(academy, invoices, '2026-04-01', '2026-04-01');
  assert.equal(statement.lines.length, 1);
  assert.equal(statement.lines[0].invoiceId, 'INV-9004');
});

test('lines are ordered oldest first', () => {
  const customer: Customer = {
    id: 'C-TEST', name: 'Test Co', address: 'somewhere',
    accountType: 'COMMERCIAL', vatRegistered: true,
  };
  const line = { description: 'Metered supply', quantity: 1, unitPence: 1000, kind: 'SUPPLY' as const };
  const out: Invoice[] = [
    { id: 'INV-C', customerId: 'C-TEST', issued: '2026-07-01', source: 'WEB', paid: false, lines: [line] },
    { id: 'INV-A', customerId: 'C-TEST', issued: '2026-01-01', source: 'WEB', paid: true, lines: [line] },
    { id: 'INV-B', customerId: 'C-TEST', issued: '2026-04-01', source: 'WEB', paid: true, lines: [line] },
  ];

  const statement = statementFor(customer, out);
  assert.deepEqual(statement.lines.map((l) => l.invoiceId), ['INV-A', 'INV-B', 'INV-C']);
  assert.deepEqual(statement.period, { from: '2026-01-01', to: '2026-07-01' });
  assert.equal(statement.totals.invoiced, 3000);
  assert.equal(statement.totals.paid, 2000);
  assert.equal(statement.totals.outstanding, 1000);
});

test('a period with nothing in it gives an empty statement, not an error', () => {
  const statement = statementFor(trelawney, invoices, '2027-01-01');
  assert.deepEqual(statement.lines, []);
  assert.deepEqual(statement.period, { from: null, to: null });
  assert.equal(statement.totals.outstanding, 0);
  assert.equal(statement.totals.displayOutstanding, '£0.00');
});

test('one customer statement never contains another customer invoices', () => {
  for (const customer of customers) {
    const statement = statementFor(customer, invoices);
    for (const line of statement.lines) {
      const invoice = invoices.find((i) => i.id === line.invoiceId)!;
      assert.equal(invoice.customerId, customer.id);
    }
  }
});
