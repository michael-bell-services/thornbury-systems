# Splitting what is left of the queue

Three jobs open, two developers. This is how to run them at once without landing on each
other. Rendered version, same content: https://claude.ai/code/artifact/42898b61-bb3a-45f5-9c98-2eacc3bd3bd3

JOB A is done and in review as PR #1. That PR also adds the reproductions referenced
below to JOB-B and JOB-D, and a CLAUDE.md.

## The split

**Lane 1 — JOB C, statements.** Touches no file that B or D touch. New module, new route,
new test file. Starts immediately and blocks on nothing. Oldest in the queue at 23 days.

**Lane 2 — JOB D, then JOB B, in that order.** They share the scheduling code and a real
dependency, so they belong to one person.

## Where the lanes touch

Nowhere. Across the two lanes there is not one shared file. The only shared file sits
inside lane 2, which is why D and B are sequential rather than parallel.

| File | JOB C | JOB D | JOB B |
| --- | --- | --- | --- |
| `src/invoices/statement.ts` (new) | owns | — | — |
| `test/statement.test.ts` (new) | owns | — | — |
| `src/server.ts` | owns | — | — |
| `src/shared/dates.ts` | — | owns | reads |
| `src/scheduling/slots.ts` | — | owns | — |
| `test/dates.test.ts` | — | owns | — |
| `src/scheduling/dispatch.ts` | — | — | owns |
| `test/scheduling.test.ts` | — | shared | shared |

## Why D has to land before B

`alreadyVisiting` in `dispatch.ts` calls `sameDay` from `dates.ts`, which is UTC based.
W-5006 shares an address with W-5003 and falls on the same *UTC* day, so it is suppressed
and never dispatched at all — even though it is the out-of-hours visit Trelawney asked
for, and in UK local time it is a different day.

The moment JOB D makes the date handling local aware, `sameDay` returns false for that
pair and W-5006 starts dispatching on its own. Write JOB B's tests against the fixed
semantics or you will write them twice.

This is the only hard ordering constraint in the queue.

## JOB C, for whoever takes lane 1

Nothing exists yet. The front end team will render whatever comes off an endpoint.

The job says nobody has agreed what goes on it, so this shape is a proposal to stop you
being blocked, not a specification. Get it confirmed and write the answer into
`JOB-C-statements.md` — leaving it in a chat window is how the VAT detail was lost.

```
GET /customers/:id/statement?from=&to=

{
  "customer": { "id", "name", "address" },
  "period":   { "from", "to" },
  "lines": [
    { "invoiceId", "issued", "net", "vat", "total", "paid",
      "displayNet", "displayVat", "displayTotal" }
  ],
  "totals": { "invoiced", "vat", "paid", "outstanding", "displayOutstanding" }
}
```

Reuse rather than rebuild:

- `totalFor(invoice)` in `src/invoices/calc.ts` already returns `{ net, vat, total }`.
  Never recompute VAT in the statement, call this.
- `outstandingFor(customerId, all)` for the closing balance.
- `format()` and `sum()` from `src/shared/money.ts`.
- Follow the `displayNet` / `displayVat` precedent set on `/invoices/:id` in PR #1: pence
  in the numeric fields, `format()` only for the display ones.

Test against C-1002, who has one unpaid invoice at 248400 including £34.00 of VAT, and
C-1001, who has one paid invoice and owes nothing. C-1004 has an invoice from a different
quarter, so use that one for the `from` and `to` filter.

## Ground rules

1. JOB D lands before JOB B starts.
2. Lane 1 never opens `test/scheduling.test.ts`. Lane 2 never opens `src/server.ts`.
3. Anything under `src/shared/` gets a heads-up before it changes. Billing and scheduling
   both depend on it, so a change there lands on both lanes at once.
4. `src/db.ts` is also the test fixture. Editing the seed data changes the other lane's
   results, so say so first.
5. Both lanes run `npm test` and `TZ=UTC npm test`. The second is expected to fail until
   JOB D lands, and expected to pass forever after.
6. Unconfirmed business rules go in the job file, not in chat.
