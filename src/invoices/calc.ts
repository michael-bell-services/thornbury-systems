import { sum, percentOf, type Pence } from '../shared/money.ts';
import type { Invoice, LineItem } from '../db.ts';

export interface InvoiceTotal {
  net: Pence;
  vat: Pence;
  total: Pence;
}

const STANDARD_RATE = 20;

export function lineTotal(line: LineItem): Pence {
  return line.quantity * line.unitPence;
}

// The one place the VAT rule lives.
//
// Metered supply is zero rated. Engineer work is standard rated. This is the
// split db.ts already describes: SUPPLY is water, SERVICE is an engineer.
//
// OPEN, for Finance: businesses in industrial categories are standard rated on
// their supply too, not just on service work. We have no field for that and
// Trelawney Foods (C-1002) may well qualify. Zero rating their supply
// understates that invoice by about GBP 456. Confirm before relying on this
// for commercial billing.
//
// Deliberately does not look at the customer. vatRegistered is the customer's
// own registration: it governs what they can reclaim, not what we charge them.
export function vatRateFor(line: LineItem): number {
  return line.kind === 'SERVICE' ? STANDARD_RATE : 0;
}

// Paper invoices carried a printing and postage charge that the web product
// never had. Kept so historic invoices still reconcile.
//
// Not a line item, so it sits outside the vatable subtotal.
function legacySurcharge(invoice: Invoice): Pence {
  if (invoice.source === 'LEGACY_PAPER') {
    return 150;
  }
  return 0;
}

export function totalFor(invoice: Invoice): InvoiceTotal {
  const net = sum(invoice.lines.map(lineTotal)) + legacySurcharge(invoice);

  // Rounded once, on the subtotal, rather than once per line. The two can
  // differ by a penny and this is the way Finance work it out by hand.
  //
  // Assumes a single non-zero rate. A second band (there is no reduced rate
  // here today) would need the vatable lines grouping by rate first.
  const vatable = sum(
    invoice.lines.filter((line) => vatRateFor(line) === STANDARD_RATE).map(lineTotal),
  );
  const vat = percentOf(vatable, STANDARD_RATE);

  return { net, vat, total: net + vat };
}

export function outstandingFor(customerId: string, all: Invoice[]): Pence {
  return sum(
    all.filter((i) => i.customerId === customerId && !i.paid).map((i) => totalFor(i).total),
  );
}
