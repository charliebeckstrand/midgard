import { act, cleanup, render } from '@testing-library/react'
import { configureAxe } from 'jest-axe'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { maxDepth } from '../../core/density/rungs'
import { AppearanceProvider } from '../../providers/appearance'
import { type DemoPage, demoPages, restoreRootAfterCase, visitTabs } from './demo-pages'

// A smoke test of each demo page of the docs site. Two test files in `docs/`
// run it, and each file gives it a part of the pages, so that the test shards
// in CI can balance the pages.
//
// It renders each page and opens each tab. A page fails when it throws, when it
// writes to `console.error` or `console.warn`, or when a curated set of axe
// rules finds a violation in any state that it shows, or when a state nests
// more density scopes than the rungs rank (`maxDepth`). `demo-coverage.test.ts`
// asks whether a page exists, and the snippet gate (`demo-snippets.tsx`) reads
// its "Show code" blocks. This test is the one that asks whether the page works.
//
// The rules are the structural ones that a demo breaks most: a button with no
// name, a role that lacks its required children, two landmarks with the same
// name, and a form control with no label. jsdom has no layout, so the rules of
// geometry stay with the browser suite.
//
// `KNOWN_FAILURES` lists the violations of today, as the count of the nodes
// that break each rule on each page. Each page must match its entries: a new
// violation fails the gate, and so does an entry that a fix makes too high.

const RULES = ['button-name', 'aria-required-children', 'landmark-unique', 'label']

// `elementRef` gives each node its element, so a node that stays through a tab
// change counts once.
const axe = configureAxe({
	resultTypes: ['violations'],
	runOnly: { type: 'rule', values: RULES },
	elementRef: true,
})

/**
 * The violations of today, keyed `page › rule`, with the count of the nodes
 * that break the rule. Fix a node, and lower its count.
 */
const KNOWN_FAILURES: Record<string, number> = {
	// A Listbox trigger that the demo builds with no label.
	'components/aspect-ratio › button-name': 1,
	'components/swatch › button-name': 1,
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

/** Collects what `console.error` and `console.warn` write during the case, and keeps it off the output. */
function captureConsole(): string[] {
	const logged: string[] = []

	for (const level of ['error', 'warn'] as const) {
		const spy = vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
			logged.push(`console.${level}: ${args.map(String).join(' ')}`)
		})

		onTestFinished(() => spy.mockRestore())
	}

	return logged
}

/** The name of a scope in a chain: its tag, its step, and its `data-slot`. */
function scopeName(element: Element): string {
	const slot = element.getAttribute('data-slot')

	return `${element.localName}[${element.getAttribute('data-density')}]${slot ? `{${slot}}` : ''}`
}

/**
 * The longest chain of density scopes in the document, outermost first. The
 * root element is the scope of the app, and it does not count as a depth.
 */
function deepestScopeChain(): Element[] {
	let deepest: Element[] = []

	for (const element of document.body.querySelectorAll('[data-density]')) {
		const chain: Element[] = []

		for (
			let node: Element | null = element;
			node && node !== document.documentElement;
			node = node.parentElement
		) {
			if (node.hasAttribute('data-density')) chain.unshift(node)
		}

		if (chain.length > deepest.length) deepest = chain
	}

	return deepest
}

/**
 * Registers a smoke case for each page of `pages`, and the check of the page
 * names in `KNOWN_FAILURES` against all the pages.
 */
export function describeDemoSmoke(pages: readonly DemoPage[]): void {
	describe('demo smoke', () => {
		it.each(pages)(
			'%s renders each tab with no console output and no known-rule violation',
			// The grid page is the slowest: axe reads each of its tabs, in about 10s.
			{ timeout: 60_000 },
			async (page, load) => {
				restoreRootAfterCase()

				const logged = captureConsole()

				const Demo = await load()

				const { container } = render(
					<AppearanceProvider>
						<Demo />
					</AppearanceProvider>,
				)

				const violations = new Map<string, Set<Element>>()

				let deepest: Element[] = []

				await visitTabs(container, async () => {
					const chain = deepestScopeChain()

					if (chain.length > deepest.length) deepest = chain

					// A demo is a live page. Its timers and effects update it while axe
					// runs, so the run goes inside `act`.
					const results = await act(() => axe(document.body))

					for (const { id, nodes } of results.violations) {
						const elements = violations.get(id) ?? new Set()

						// The axe types leave out the `element` that `elementRef` adds.
						for (const node of nodes as ((typeof nodes)[number] & { element?: Element })[]) {
							if (node.element) elements.add(node.element)
						}

						violations.set(id, elements)
					}
				})

				const scopes = deepest.map(scopeName)

				cleanup()

				const found = Object.fromEntries(
					[...violations].map(([rule, elements]) => [`${page} › ${rule}`, elements.size]),
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
