# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The HTTP API behind the Thornbury Systems web front end: billing and job scheduling for
UK water utilities. It was extracted from a desktop product that is not in this
repository. That migration stalled in 2023, so this is the half that got done — expect
to find fields and helpers that came across with no live caller.

## Commands

No install step, no dependencies, no `node_modules`. Node 22.6+ runs the TypeScript
directly via type stripping.

```
npm test                                                  # the whole suite
npm start                                                  # http://localhost:4310
node --experimental-strip-types --test test/money.test.ts  # one file
```

`--test-name-pattern "<regex>"` narrows to matching test names.

There is no build step, no linter, and no `tsconfig.json` (dropped as unused in 51839b2).

**Nothing type checks.** Type stripping erases annotations without validating them —
`const x: number = "nope"` runs happily. Types here are documentation that the runtime
never enforces, so a green suite says nothing about type correctness.

**Imports need explicit `.ts` extensions.** `import { sum } from '../shared/money.ts'`.
Dropping the extension fails at runtime, not at edit time.

## The two invariants

These are the only rules the team ever fully agreed on. Everything else is up for grabs.

1. **Money is integer pence** below the UI — the `Pence` type in `src/shared/money.ts`.
   Anything a customer sees goes through `format()`. Do not introduce float arithmetic:
   the desktop product stored pounds as floats and the import path still throws off
   rounding tickets.
2. **Dates are stored UTC and shown UK local.** `src/shared/dates.ts` is where those two
   keep getting conflated.

## Layout

- `src/invoices` — line totals, invoice totals, outstanding balances, and VAT
  (`vatRateFor` is the one place the rate rule lives)
- `src/scheduling` — engineer dispatch (`dispatch.ts`) and customer appointment windows (`slots.ts`)
- `src/shared` — `money.ts` and `dates.ts`, used by both sides above
- `src/db.ts` — seed data and the type definitions, standing in for SQL Server tables
- `src/server.ts` — the whole route table, hand-rolled on `node:http`, no framework
- `jobs/` — the support queue

## Landmines

**The suite is not timezone-independent.** `test/scheduling.test.ts` asserts a window of
`08:00 to 11:00` for a work order requested at `08:00Z`. That only holds in Europe/London
under BST; under `TZ=UTC` it fails with `07:00 to 10:00`. Run `npm test` with no `TZ`
override, and do not read a green suite as evidence that date handling is correct.

**The VAT rule is an inference, not a ruling.** `vatRateFor` in `src/invoices/calc.ts`
zero rates metered supply and charges 20% on engineer work. Finance have never confirmed
it, and the industrial-user case is still open. Read `jobs/JOB-A-vat.md` before changing
anything that bills a commercial customer.

**`src/shared` reaches further than it looks.** Billing and scheduling both depend on it,
so a change to `money.ts` or `dates.ts` lands on both sides at once.

**`src/db.ts` is also the test fixture.** It is an in-memory stand-in for the real SQL
Server tables, and the tests assert against its exact contents. Editing the seed data
changes test outcomes.

**Some fields are inert.** `Customer.accountType` and `Customer.vatRegistered` came
across in the original extraction (dd3ba93) and their intended meaning was never written
down. Check what actually reads a field before assuming it drives behaviour — as of the
VAT work, neither of those two does.

## The support queue

`jobs/` holds the open items, kept in the repo so they stop living in email. Read the
relevant one before changing the area it covers. Several describe symptoms that have been
closed as "cannot reproduce" more than once, which usually means the reproduction depends
on something about the environment rather than the input.

## Working on the scheduling side

Priya wrote most of `src/scheduling` and left in March; nobody has picked it up. If
something in there looks deliberate it probably was, but the reasoning is not recorded
anywhere. The comments tend to document what was tried rather than why the code is the
shape it is.
