# JOB D: a customer was given the wrong day

**Raised by:** Support (Marcus, 26 Aug)
**Queue age:** 2 days

Trelawney have a late backflow test booked and the confirmation we sent them has
the wrong date on it. Marcus checked the work order and the stored time is right,
so it is what we print that is wrong.

He says this is the same thing as W-4412, which has been closed twice as cannot
reproduce. Both reports came in the summer. Nobody has managed to make it happen
in the winter, and it has never once failed on the build box.

Everything the customer sees is UK local. Everything we store is UTC. Somewhere
those two are being treated as the same thing.

---

## Reproduced 1 Sep 2026

W-5006 is told `2026-09-02` but starts `2026-09-03` in UK local time.

`slotFor` builds one object from two clocks: `window` comes from `formatSlotTime`
(`dates.ts:33`), which reads `getHours()` and so follows the machine's local clock, while
`date` comes from `order.requestedAt.slice(0, 10)`, which is the UTC calendar date. When
the two disagree the customer gets local times under a UTC date.

That needs BST *and* a time near midnight, which is why it only ever surfaced in summer.
W-5006 is the only such order and it was added in 51839b2. The build box runs
Europe/London, the same as everyone's laptop, so it was green there too.

The fix is to stop reading the ambient clock: format with an explicit
`timeZone: 'Europe/London'` via `Intl.DateTimeFormat`. Verified to give identical output
under `TZ=UTC` and under the machine zone, and to switch correctly between BST and GMT.

**Do not blanket-change `toDateKey`.** It feeds `isWorkingDay` and `sameDay`, and
`sameDay` is load bearing for dispatch. Add a local-date helper and move call sites one at
a time.

**This job must land before JOB B.** See the note in JOB-B-duplicate-dispatch.md.
