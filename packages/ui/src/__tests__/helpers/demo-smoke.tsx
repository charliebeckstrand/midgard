import { describe, expect, it } from 'vitest'
import { maxDepth } from '../../core/density/rungs'
import { type DemoPage, demoPages, walkOf } from './demo-pages'

// A smoke test of each demo page of the docs site. Two test files in `docs/`
// run it with the snippet gate, and each file gives the two gates a part of the
// pages, so that the test shards in CI can balance the pages.
//
// It renders each page and opens each tab. A page fails when it throws, when it
// writes to `console.error` or `console.warn`, or when a curated set of axe
// rules finds a violation in any state that it shows, or when a state nests
// more density scopes than the rungs rank (`maxDepth`). `demo-coverage.test.ts`
// asks whether a page exists, and the snippet gate (`demo-snippets.tsx`) reads
// its "Show code" blocks. This test is the one that asks whether the page works.
//
// The two gates share one walk of each page (`walkOf` in `demo-pages.tsx`). The
// walk runs axe in each state before it opens a block, and it closes each block
// that it opens. Output to the console while a block is open goes to the
// snippet gate, not to this test.
//
// The rules (`AXE_RULES` in `demo-pages.tsx`) are the structural ones that a
// demo breaks most: a button with no name, a role that lacks its required
// children, two landmarks with the same name, and a form control with no label.
// jsdom has no layout, so the rules of geometry stay with the browser suite.
//
// `KNOWN_FAILURES` lists the violations of today, as the count of the nodes
// that break each rule on each page. Each page must match its entries: a new
// violation fails the gate, and so does an entry that a fix makes too high.

/**
 * The violations of today, keyed `page › rule`, with the count of the nodes
 * that break the rule. Fix a node, and lower its count.
 */
const KNOWN_FAILURES: Record<string, number> = {
	// A Listbox trigger that the demo builds with no label.
	'components/aspect-ratio › button-name': 1,
	'providers/density › button-name': 1,

	// An icon-only trigger with no `aria-label`: the sidebar's menu, and the
	// edit button of each row in the grid's actions column.
	'components/sidebar › button-name': 1,
	'modules/grid › button-name': 5,

	// Two examples show a landmark with the same name, or with none, so a
	// landmark list cannot tell them apart.
	'components/accordion › landmark-unique': 1,
	'components/kanban › landmark-unique': 5,
	'components/nav › landmark-unique': 2,
	'components/pdf-viewer › landmark-unique': 1,
	'components/sidebar › landmark-unique': 1,
	'modules/grid › landmark-unique': 1,
}

/** The entries of `KNOWN_FAILURES` for one page. */
function knownFailuresOf(page: string): Record<string, number> {
	return Object.fromEntries(
		Object.entries(KNOWN_FAILURES).filter(([key]) => key.startsWith(`${page} › `)),
	)
}

/**
 * Registers a smoke case for each page of `pages`, and the check of the page
 * names in `KNOWN_FAILURES` against all the pages.
 */
export function describeDemoSmoke(pages: readonly DemoPage[]): void {
	describe('demo smoke', () => {
		it.each(pages)(
			'%s renders each tab with no console output and no known-rule violation',
			// The grid page is the slowest. The case that walks it runs axe on each of
			// its tabs, in about 10s, and opens about 45 blocks, in about 7s.
			{ timeout: 60_000 },
			async (page, load) => {
				const { logged, violations, scopes } = await walkOf(page, load)

				const found = Object.fromEntries(
					Object.entries(violations).map(([rule, count]) => [`${page} › ${rule}`, count]),
				)

				expect(logged).toEqual([])

				expect(found).toEqual(knownFailuresOf(page))

				expect(scopes.length, `${page} nests ${scopes.join(' > ')}`).toBeLessThanOrEqual(maxDepth)
			},
		)

		it('names only pages that exist in its known failures', () => {
			const names = new Set(demoPages.map(([page]) => page))

			const unknown = Object.keys(KNOWN_FAILURES).filter(
				(key) => !names.has(key.split(' › ')[0] ?? ''),
			)

			expect(unknown).toEqual([])
		})
	})
}
