# JOB C: customers want a statement, not four invoices

**Raised by:** Trelawney Foods, via account management (5 Aug)
**Queue age:** 23 days

Their finance team asked for "a statement like our other suppliers send" because
they are reconciling four separate invoice PDFs by hand every quarter.

We do not have anything like this. The front end team say they can render whatever
we give them as long as it comes off an endpoint.

Nobody has agreed what goes on it.

---

## Done 1 Sep 2026 — shape still needs agreeing

`GET /customers/:id/statement`, optionally narrowed with `?from=` and `?to=` on the issue
date. Returns the customer, the period covered, one line per invoice with net, VAT and
gross both in pence and formatted, and totals for invoiced, VAT, paid and outstanding.

Built on `totalFor`, so a statement can never disagree with the invoice it came from. VAT
is not recalculated anywhere in `statement.ts`.

**The shape is still a proposal.** The job says nobody agreed what goes on it, and nobody
has since. It is modelled on what Trelawney asked for — one document instead of four PDFs
— but account management have not seen it. Confirm before the front end builds against it.

Two things to raise when they do:

1. **No running balance.** Each line shows its own total and the statement totals at the
   bottom. If their other suppliers show a running balance down the page, that is an
   additive change.
2. **Outstanding is the period's, not the account's.** It is summed from the lines shown,
   so a narrowed statement reports what is owed *within that period*. With no filter it
   equals `outstandingFor` and there is a test holding it to that. If they expect the full
   account balance on every statement regardless of the filter, that changes.

The date filter compares `issued` as a string and never builds a `Date`, so this endpoint
is not exposed to the UTC and UK local confusion in JOB D.
