# Potential apps

> **Briefs for apps that midgard could hold.** A brief states what an app is, the one hard problem that earns it, the `ui` surfaces it consumes, and the increments that build it. Nobody has approved the work. The brief exists so the design survives the conversation that produced it.

A brief is not a plan. A plan under [`packages/ui/docs/plans`](../../packages/ui/docs/plans) records a design for work in flight or already shipped. A brief records a design for work that can never start.

## Briefs

| Brief | Subject |
|---|---|
| [`STUDIO.md`](STUDIO.md) | A planner for a photo shoot, over a solar ephemeris. It answers when the light falls as a shot needs it, and whether one day holds every shot. |

## Naming

A brief takes the name `{APP}.md`, where `{APP}` is the app's proposed name in upper case. One brief holds one app.

A brief carries no date prefix. It is a living document until its idea resolves, unlike an audit or a plan, which both fix a date ([`CONVENTIONS.md`](../../CONVENTIONS.md) §12.3).

## Shape

Each brief answers the same questions in this order: the thesis, the pure core, the hard question that earns the app, the limits it declines to cross, the `ui` surfaces it reads, the file shape, the proof, the increments, what is ruled out, and what is still open.

The thesis must name the one hard problem. An app that composes `ui` well but solves nothing is a demo, and the docs site already holds demos.

## Lifecycle

Delete a brief when its app ships, or when the idea is refused. A shipped app carries its own README, and a plan beside it records the design; the brief then repeats both.

Do not reference a brief from code, or from a document that outlives it. The reference dangles when the brief goes — the same rule an audit carries ([`CONVENTIONS.md`](../../CONVENTIONS.md) §12.4).

---

**See also:** [`../README.md`](../README.md) · [`../../CONVENTIONS.md`](../../CONVENTIONS.md) §12 · [`../../CADENCE.md`](../../CADENCE.md) · [`../../STE.md`](../../STE.md).
