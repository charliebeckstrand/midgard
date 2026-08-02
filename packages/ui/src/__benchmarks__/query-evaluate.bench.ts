// @vitest-environment node

import { bench, describe } from 'vitest'
import { isQueryActive } from '../modules/query/engine/query-active'
import { evaluateQuery, matchQueryRule } from '../modules/query/engine/query-evaluate'
import { formatQuerySummary, summarizeQuery } from '../modules/query/engine/query-summary'
import type { QueryGroup, QueryNode } from '../modules/query/engine/types'
import { makeQueryTree, QUERY_FIELDS, type Shipment, shipments } from './fixtures'

/**
 * What a built query costs to *use*, where `query-builder.bench.ts` measures
 * what it costs to edit. Three readers sit on different clocks:
 * {@link evaluateQuery} runs once per row — a client-side filter walks the
 * whole tree for every row in the dataset, so its per-row cost multiplies by
 * ten or a hundred thousand; {@link isQueryActive} and {@link summarizeQuery}
 * run once per render of whatever affordance shows the query.
 *
 * Node env, no DOM. Tree sizes match the builder bench's, so the two read
 * against each other.
 */

// Tree sizes (depth × branching): total rules ≈ branching^(depth+1)
// shallow-wide  (d=1, b=20)  =  20 rules
// balanced      (d=3, b=4)   = 256 rules
// deep-wide     (d=4, b=4)   = 1024 rules

const shallowWide = makeQueryTree(1, 20)

const balanced = makeQueryTree(3, 4)

const deepWide = makeQueryTree(4, 4)

const TREES = [
	{ label: 'shallow-wide (20 rules)', tree: shallowWide },
	{ label: 'balanced (256 rules)', tree: balanced },
	{ label: 'deep-wide (1,024 rules)', tree: deepWide },
] as const

/** Rewrites every combinator in a tree, so the two folds can be compared. */
function withCombinator(group: QueryGroup, combinator: 'and' | 'or'): QueryGroup {
	const children: QueryNode[] = group.children.map((child) =>
		child.type === 'group'
			? { ...withCombinator(child, combinator), combinator }
			: { ...child, combinator },
	)

	return { ...group, combinator, children }
}

/**
 * A tree of blank rules — what a freshly seeded or fully cleared builder holds.
 * Every rule reads as no constraint, so `isQueryActive` cannot exit early and
 * must walk to the last node: its worst case, and the state a builder sits in
 * before the user types anything.
 */
function blanked(group: QueryGroup): QueryGroup {
	const children: QueryNode[] = group.children.map((child) =>
		child.type === 'group' ? blanked(child) : { ...child, value: '' },
	)

	return { ...group, children }
}

const rows = shipments(1_000)

const row = rows[0] as Shipment

const getValue = (field: string) => (row as unknown as Record<string, unknown>)[field]

describe('query-evaluate · evaluateQuery (once per row)', () => {
	// The per-row walk, folded both ways over the same tree.
	//
	// The fold evaluates each child into a local before combining it, so neither
	// combinator short-circuits: an `and` whose first rule already failed still
	// walks every remaining rule, and the two bars land together. That is the
	// finding these bars record — a fold that called the evaluator lazily would
	// let a failed `and` (or a satisfied `or`) stop at the first decisive rule,
	// which on a large tree is most of the walk.
	for (const { label, tree } of TREES) {
		const conjunction = withCombinator(tree, 'and')

		const disjunction = withCombinator(tree, 'or')

		bench(`${label} · and`, () => {
			evaluateQuery(conjunction, getValue)
		})

		bench(`${label} · or`, () => {
			evaluateQuery(disjunction, getValue)
		})
	}
})

describe('query-evaluate · a client-side filter pass (1,000 rows)', () => {
	// What the per-row number above multiplies out to. A grid filtering its own
	// rows runs this on every keystroke that edits the query, and again on every
	// dataset refresh — so the per-row walk is charged a thousand times here, and
	// a hundred thousand times on a dashboard-sized set.
	for (const { label, tree } of TREES.slice(0, 2)) {
		const disjunction = withCombinator(tree, 'or')

		bench(`${label} · 1,000 rows`, () => {
			rows.filter((candidate) =>
				evaluateQuery(
					disjunction,
					(field) => (candidate as unknown as Record<string, unknown>)[field],
				),
			)
		})
	}
})

describe('query-evaluate · matchQueryRule (per rule, per row)', () => {
	// The leaf the walk repeats: a Map-free object lookup, an empty-value gate,
	// then the matcher. The three bars are its distinct exits — an unknown
	// operator answers immediately, an empty rule value answers after the gate,
	// and a real comparison runs the matcher.
	bench('unknown operator (returns true immediately)', () => {
		matchQueryRule('__absent__', 'delivered', 'x')
	})

	bench('empty rule value (gated before the matcher)', () => {
		matchQueryRule('equals', 'delivered', '')
	})

	bench('equals · matcher runs', () => {
		matchQueryRule('equals', 'delivered', 'delivered')
	})

	bench('contains · matcher runs', () => {
		matchQueryRule('contains', 'Seattle → Denver', 'Denver')
	})
})

describe('query-active · isQueryActive (per render of the affordance)', () => {
	// Gates every filter chip, badge, and summary line. It walks until it finds
	// one constraining rule, so an active query exits on its first rule and stays
	// flat in the tree size, while an inactive one — every rule blank, what a
	// freshly seeded or fully cleared builder holds — walks to the last node. The
	// blank bar is therefore both the common resting state and the worst case.
	for (const { label, tree } of TREES) {
		const blank = blanked(tree)

		bench(`${label} · active (exits on the first rule)`, () => {
			isQueryActive(tree, QUERY_FIELDS)
		})

		bench(`${label} · all rules blank (walks the tree)`, () => {
			isQueryActive(blank, QUERY_FIELDS)
		})
	}
})

describe('query-summary · summarize and render', () => {
	// The read view over a query. `summarizeQuery` builds one token per rule plus
	// the combinators and brackets; `formatQuerySummary` joins them into a line.
	// Both run per render, and both are linear in the rule count — a thousand-rule
	// tree is not a realistic filter chip, but it bounds what a summary costs
	// before a consumer needs to truncate it.
	for (const { label, tree } of TREES) {
		bench(`${label} · summarizeQuery (tokens)`, () => {
			summarizeQuery(tree, QUERY_FIELDS)
		})

		bench(`${label} · formatQuerySummary (line)`, () => {
			formatQuerySummary(tree, QUERY_FIELDS)
		})
	}
})
