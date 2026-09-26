# RefundDrop

**Claim what airlines owe you — and keep all of it.**

RefundDrop checks whether a delayed, cancelled or overbooked flight entitles you to money under EU261, UK261 or US DOT refund rules. It explains every step of its reasoning with the rule it relied on, and (coming next) generates a ready-to-send claim kit, so you don't hand 25–50% of your payout to a claim company.

> Built for the RevenueCat Shipaton 2026 **Next Gen Award**.

## Status

| Part | State |
| --- | --- |
| Rules engine (EU261, UK261, US DOT refunds) | Done, 51 tests |
| Sample flights (demo mode, no API key needed) | Done |
| Preview screen | Done |
| Flight lookup via AeroDataBox + Cloudflare Worker proxy | Day 2 |
| Scan → flight card → questions → verdict screens | Day 2 |
| RevenueCat paywall + Claim Kit | Day 3 |
| Boarding-pass barcode scanning | Day 3–4 |

## What makes it different

- **Honest output.** It says *likely*, *possibly*, *refund only* or *not covered*, never "you are owed". An unknown cause of disruption produces "possibly eligible" and a claim letter that asks the airline to state it.
- **Explainable.** Every verdict lists the steps it took and the article or court ruling behind each one.
- **Deterministic.** Eligibility comes from a pure TypeScript rules engine, not an AI model. Same input, same answer, fully tested.
- **Versioned rules.** Thresholds and amounts live in `src/rules/config.ts`, so the EU261 reform expected in 2027 is a config change, not a rewrite.

## What the engine covers

| Situation | Rule |
| --- | --- |
| Which regime applies (departure airport, destination, operating airline's licence) | EU261 / UK261 Art. 3 |
| Arrival delay of 3h+, measured at the final destination | CJEU Sturgeon, Germanwings, Folkerts |
| Distance bands €250 / €400 / €600 (£220 / £350 / £520), great-circle, intra-EU cap | Art. 7(1), 7(4) |
| 50% reduction for long-haul 3–4h delays and close reroutes | Art. 7(2) |
| Cancellations: 14-day notice rule and replacement-flight allowances | Art. 5(1)(c) |
| Extraordinary circumstances vs airline-controlled causes | Art. 5(3); Wallentin-Hermann; Airhelp v SAS |
| Denied boarding, voluntary vs involuntary | Art. 4 |
| Connections on one booking vs separate tickets | Art. 2(h); Folkerts |
| Codeshares: claim from the operating airline | Art. 3(5) |
| US: cash refund if significantly delayed (3h domestic / 6h international) or cancelled and you didn't travel | 14 CFR 260 |

The US has no federal cash compensation for delays — DOT withdrew that proposal in November 2025 — so US flights get refund guidance only.

## Project layout

```
src/rules/          Rules engine (pure TypeScript, no React)
  types.ts          Inputs and verdict types
  config.ts         Versioned thresholds and amounts
  engine.ts         Scope → disruption → amount → verdict
  geo.ts            Regions and great-circle distance
  reference.ts      Airports and airline licences
src/data/           Sample flights for demo mode
tests/              Vitest suite for the engine
App.tsx             Preview screen
```

## Run it

You need [Node.js LTS](https://nodejs.org) and [Git](https://git-scm.com).

```bash
git clone https://github.com/sam16448/refunddrop.git
cd refunddrop
npm install
npm test          # runs the rules-engine tests
npx expo start    # then press "a" to open on an Android emulator
```

No API key is needed: the app runs on built-in sample flights. Copy `.env.example` to `.env` to connect live flight data once the proxy is deployed.

## Sample flights

The four sample flights use realistic routes and schedules with **invented** disruptions, chosen to show each rule path: a long-haul EU delay (€600), a short-notice EU cancellation (€250), a US domestic delay (refund only) and a non-European airline flying into the UK (not covered). They are labelled "Sample" in the app.

## Disclaimer

RefundDrop gives general information based on published passenger-rights rules. It is not legal advice. Final eligibility depends on facts the airline must confirm, such as the cause of the disruption.

## License

[MIT](LICENSE)
