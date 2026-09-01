# JOB A: VAT is missing from invoices

**Raised by:** Finance (Sandra, 12 Aug)
**Queue age:** 16 days

Sandra says the totals we send out do not have VAT on them and she has been adding
it by hand in a spreadsheet since the web front end went live. Accounts want it on
the invoice itself.

She also mentioned something about not all of it being vatable but I did not write
down what she said. Her email is in the shared mailbox somewhere.

Needs to show on the invoice and in the outstanding balance.

---

## Done 1 Sep 2026 — but not signed off

VAT is now calculated in `src/invoices/calc.ts`. Metered supply is zero rated, engineer
work is standard rated at 20%. It shows on `/invoices/:id` (`vat`, plus `displayVat` and
`displayNet` for the front end) and is included in the outstanding balance on
`/customers/:id`. It applies to every invoice including historic and paid ones, so the
API finally agrees with the spreadsheet Sandra has been keeping by hand.

**The rule is our inference, not Sandra's answer.** Her email was never dug out of the
shared mailbox. We took the split from the hint already in `db.ts` — SUPPLY is metered
water, SERVICE is an engineer — because it matches how UK water VAT works. Finance have
not confirmed it.

**Two questions still to put to Sandra:**

1. Is "SUPPLY zero rated, SERVICE at 20%" what you meant by not all of it being vatable?

2. Does Trelawney Foods count as an industrial user? Businesses in industrial categories
   are standard rated on their *water supply* as well, not just on service work. We zero
   rate it. If that is wrong, INV-9002 is understated by £456 — £2,484.00 against
   £2,940.00. Severn Vale Academy is not affected; a school is not industrial. Note that
   nothing in `Customer` tells the two apart, as both are `COMMERCIAL`.

Until question 2 is answered, commercial VAT should not be treated as correct. The one
place to change is `vatRateFor` in `src/invoices/calc.ts`.
