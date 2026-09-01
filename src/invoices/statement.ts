import { format, sum, type Pence } from '../shared/money.ts';
import { totalFor } from './calc.ts';
import type { Customer, Invoice } from '../db.ts';

export interface StatementLine {
  invoiceId: string;
  issued: string;
  net: Pence;
  vat: Pence;
  total: Pence;
  paid: boolean;
  displayNet: string;
  displayVat: string;
  displayTotal: string;
}

export interface Statement {
  customer: { id: string; name: string; address: string };
  period: { from: string | null; to: string | null };
  lines: StatementLine[];
  totals: {
    invoiced: Pence;
    vat: Pence;
    paid: Pence;
    outstanding: Pence;
    displayOutstanding: string;
  };
}

// Trelawney asked for "a statement like our other suppliers send", because their finance
// team were reconciling four separate invoice PDFs by hand every quarter.
//
// OPEN: nobody has agreed what belongs on a statement. This is the shape proposed in
// jobs/WORK-SPLIT.md, not something account management have signed off. Confirm it before
// the front end builds against it.

// `issued` is a plain 'YYYY-MM-DD' string, so the range filter compares strings and never
// constructs a Date. That is deliberate: nothing in this file can drift between UTC and
// UK local the way the appointment windows do (see jobs/JOB-D-timezone.md).
function withinPeriod(invoice: Invoice, from?: string, to?: string): boolean {
  if (from && invoice.issued < from) return false;
  if (to && invoice.issued > to) return false;
  return true;
}

export function statementFor(
  customer: Customer,
  all: Invoice[],
  from?: string,
  to?: string,
): Statement {
  const included = all
    .filter((i) => i.customerId === customer.id && withinPeriod(i, from, to))
    .sort((a, b) => a.issued.localeCompare(b.issued));

  const lines: StatementLine[] = included.map((invoice) => {
    // Never recalculate VAT here. totalFor is the one place invoice money is worked out.
    const { net, vat, total } = totalFor(invoice);
    return {
      invoiceId: invoice.id,
      issued: invoice.issued,
      net,
      vat,
      total,
      paid: invoice.paid,
      displayNet: format(net),
      displayVat: format(vat),
      displayTotal: format(total),
    };
  });

  // Outstanding is worked out from the lines on the statement rather than from
  // outstandingFor, so the totals always describe what the customer is looking at. With no
  // date filter the two agree, and the tests hold us to that.
  const outstanding = sum(lines.filter((l) => !l.paid).map((l) => l.total));

  return {
    customer: { id: customer.id, name: customer.name, address: customer.address },
    // The span the statement actually covers, which is narrower than the account whenever
    // a from or to was given.
    period: {
      from: lines.at(0)?.issued ?? null,
      to: lines.at(-1)?.issued ?? null,
    },
    lines,
    totals: {
      invoiced: sum(lines.map((l) => l.total)),
      vat: sum(lines.map((l) => l.vat)),
      paid: sum(lines.filter((l) => l.paid).map((l) => l.total)),
      outstanding,
      displayOutstanding: format(outstanding),
    },
  };
}
