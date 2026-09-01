# JOB B: two vans to the same house

**Raised by:** Support (Marcus, 21 Aug)
**Queue age:** 7 days

Mrs Whitcombe had two engineers turn up on the same morning, half an hour apart,
one for the meter and one for the leak. She was not happy and it is not the first
time. Marcus says it happens most weeks.

There is a check in the dispatcher that is supposed to stop this. Either it is not
running or it is not catching it.

The addresses in our system are typed in by whoever takes the call.

---

## Reproduced 1 Sep 2026

The check runs. It just cannot see a lowercase street:

    W-5001  E-01 Dean Prosser  08:00  "14 Ashfield Row, Bristol"
    W-5002  E-01 Dean Prosser  08:30  "14 ashfield row, bristol"

`alreadyVisiting` (`dispatch.ts:17`) compares addresses with `===`, so the two do not
match and both vans go out. Normalising before the comparison fixes the reported symptom.
The real fix is a site identifier in the schema rather than string matching on text typed
in by whoever took the call.

**Do this after JOB D, not before.** `alreadyVisiting` calls `sameDay` from `dates.ts`,
which is UTC based. W-5006 shares an address with W-5003 and falls on the same *UTC* day,
so it is currently suppressed and never dispatched at all — even though it is the
out-of-hours visit Trelawney asked for, and in UK local time it is a different day. Once
JOB D makes the date handling local aware, `sameDay` returns false for that pair and
W-5006 starts dispatching on its own. Write the tests against the fixed semantics or you
will write them twice.

**Two more defects, found while reproducing this one. Not yet agreed as in scope:**

1. Nobody checks whether an engineer is free. `engineers.find((e) => canDo(e, order))`
   always returns the first capable engineer, so Dean Prosser takes 4 of the 5 planned
   jobs — 08:00 (60 min) overlaps 08:30, and 13:00 (60 min) overlaps 13:30 in another
   town. Ryan Betts gets nothing. Deduplicating addresses does not fix this.
2. The one visit per address per day rule is silently cancelling legitimate work, as
   above with W-5006.
