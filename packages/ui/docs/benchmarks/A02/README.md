# `A02` benchmark

**Scope:** 71 files and 5,841 lines of `packages/ui/src/components` — the `calendar` theme and the first half of `data-display`. **Purpose:** score a bug-detection agent against a known answer. **Answer key:** 21 defects and 6 refuted claims, each judged twice by independent readers that agreed on survive-or-die for all 34 claims they saw.

This directory is data, not a record of work. It carries no finding of its own and it closes no row. Nothing deletes it when an audit goes.

## The scope reproduces with no script

`scope.txt` is the authority, and the walk below is the check. Take every `.ts` and `.tsx` file in seven directories under `packages/ui/src/components`: `calendar`, `json-tree`, `kanban`, `list`, `pivot-table`, `stat`, and `tree`. Sort the repo-relative paths with `LC_ALL=C`. That gives the 71 paths of `scope.txt`, the 14 of `u1.txt`, and the 57 of `u2.txt`.

```sh
find packages/ui/src/components/{calendar,json-tree,kanban,list,pivot-table,stat,tree} \
  -name '*.ts' -o -name '*.tsx' | LC_ALL=C sort
```

## The digests

A digest is the first seven hex digits of one SHA-256 over the sorted repo-relative paths, joined by a newline, **with no trailing newline**.

```sh
printf '%s' "$(LC_ALL=C sort scope.txt)" | sha256sum | cut -c1-7
```

| file | paths | digest |
|---|---|---|
| `scope.txt` | 71 | `674adc3` |
| `u1.txt` — calendar | 14 | `1e3a282` |
| `u2.txt` — data-display 1/2 | 57 | `8989cbd` |

A trailing newline gives `33b8d73` for the scope. That is the wrong answer, and it is recorded here so a mismatch reads as a formatting slip rather than as a moved scope.

## The answer key

`defects.json` holds 21 defects. Each one carries a stable id, the file, the symbol, the severity, the unit, the reach, and a one-line mechanism. One defect is medium-high, seven are medium, and thirteen are low. None is high.

One defect alone reaches a shipped surface: `D15`, where a Kanban column composes an empty class string for its drop-target highlight, so the column paints nothing during any drag on the demo that ships the component.

`defects.json` also holds the 6 claims that both judges refuted, each with the guard that killed it. Score precision against that list: a run that raises one of those six has produced a known false claim.

## The baselines to beat

Every figure below is measured over this exact scope.

| reader | defects of 21 | tokens |
|---|---|---|
| one Opus sweep, three separate runs | 17, 14, 13 | 324,180 / 306,836 / 294,357 |
| two Opus sweeps, union | 19 to 20 | about twice one sweep |
| one Sonnet sweep | 3 | 180,254 |
| one Haiku sweep | 1 | 127,528 |
| one general-purpose agent that also judges its own claims | 11 | 479,934 |

Two further figures bound the judgement step. One blind batched verification of 34 claims cost 380,858 tokens, about 11,200 for each claim. Of 23 claims that one Opus sweep raised, the judge refuted 6, so that reader's false-claim rate is 26 percent.

Read the spread of 17, 14 and 13 before you read any single result. Three runs of one reader over one file set differ by four defects, so one run of a new reader proves little on its own.

## How to score a run

Match each claim the run raises against `defects.json` by file and by symbol or mechanism. Report the count of the 21 reached, the count of the 6 refuted claims re-raised, the tokens, and the number of agent invocations. A claim that matches no entry is novel and counts as neither: it needs its own verdict before it means anything.

The code is half the instrument. Score a run at a revision where these 71 files still hold these defects, and record the revision beside the result.
