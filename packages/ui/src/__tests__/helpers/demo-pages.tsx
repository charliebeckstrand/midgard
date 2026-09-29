/// <reference types="vite/client" />
import { act, fireEvent } from '@testing-library/react'
import type { ComponentType } from 'react'
import { onTestFinished } from 'vitest'

// The demo pages of the docs site, and a walk over each state that a page's tabs
// show. The snippet gate and the demo smoke test read the same pages.

const loaders = import.meta.glob<ComponentType>(
	[
		'../../docs/demos/components/*.tsx',
		'../../docs/demos/providers/*.tsx',
		'../../docs/demos/modules/*.tsx',
		'../../docs/demos/modules/*/index.tsx',
		'../../docs/demos/structure/*.tsx',
	],
	{ import: 'Demo' },
)

/** `components/button` for `../../docs/demos/components/button.tsx`. */
function pageOf(path: string): string {
	return path.replace('../../docs/demos/', '').replace(/(\/index)?\.tsx$/, '')
}

/** A demo page, as its name and a loader of its `Demo`. */
export type DemoPage = readonly [string, () => Promise<ComponentType>]

/** Each demo page, in name order. */
export const demoPages: readonly DemoPage[] = Object.keys(loaders)
	.sort()
	.map((path) => [pageOf(path), loaders[path] as () => Promise<ComponentType>] as const)

// The six pages of `modules/` take about as long to walk as the other 103
// pages. Thus the smoke test and the snippet gate each run them in a test file
// of their own, and a test shard in CI gets about half of each gate.

/** The pages of `modules/`. */
export const modulePages = demoPages.filter(([page]) => page.startsWith('modules/'))

/** The pages that are not in `modules/`. */
export const otherPages = demoPages.filter(([page]) => !page.startsWith('modules/'))

/** The label of a tab, qualified by its tablist, so two lists with a tab `A` stay apart. */
function tabKey(tab: Element): string {
	const list = tab.closest('[role="tablist"]')

	const siblings = [...(list?.querySelectorAll('[role="tab"]') ?? [])].map((t) => t.textContent)

	return `${siblings.join('|')}::${tab.textContent}`
}

/**
 * Calls `visit` on the first render of a page, and again after it opens each
 * tab. It opens every tab that it finds, including a tab that a panel reveals,
 * until no tab is left unopened. A disabled tab stays closed.
 */
export async function visitTabs(container: Element, visit: () => Promise<void>): Promise<void> {
	await visit()

	const seen = new Set<string>()

	for (;;) {
		const next = [...container.querySelectorAll('[role="tab"]')].find(
			(tab) => !seen.has(tabKey(tab)) && tab.getAttribute('aria-disabled') !== 'true',
		)

		if (!next) break

		seen.add(tabKey(next))

		await act(async () => {
			fireEvent.click(next)
		})

		await visit()
	}
}

/**
 * Put back the theme class and the density step that `AppearanceProvider`
 * writes to the root element and does not remove on unmount. The window is
 * shared across the files of a worker, so a step left on the root would reach
 * a later file that reads it.
 */
export function restoreRootAfterCase(): void {
	const root = document.documentElement

	const density = root.getAttribute('data-density')

	const dark = root.classList.contains('dark')

	onTestFinished(() => {
		if (density === null) root.removeAttribute('data-density')
		else root.setAttribute('data-density', density)

		root.classList.toggle('dark', dark)
	})
}
