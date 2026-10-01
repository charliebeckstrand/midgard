/// <reference types="vite/client" />
import { act, cleanup, fireEvent, render, within } from '@testing-library/react'
import { configureAxe } from 'jest-axe'
import type { ComponentType } from 'react'
import { onTestFinished, vi } from 'vitest'
import { readRootDensity, writeRootDensity } from '../../core/density'
import { DemoApiContext } from '../../docs/engine/components/axes'
import { AppearanceProvider } from '../../providers/appearance'
import { demoApiOf } from './demo-api'

// The demo pages of the docs site, and a walk over each state that a page's tabs
// show. The snippet gate and the demo smoke test read the same pages.
//
// The two gates share one walk of each page (`walkOf`). A walk costs as much as
// the checks of both gates, and a second walk read the same states again. Each
// gate keeps its own case and its own expectations, so a failure of one gate
// does not show as a failure of the other.

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
// pages. Thus two test files run the two gates, one on each part, so that each
// test shard in CI gets about half of the walks. More files cost more: each
// worker that runs one of them loads the demos, axe, and the TypeScript lib
// again, in about 8s.

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

/** The rules that the smoke test asks axe to run. `demo-smoke.tsx` tells why. */
const AXE_RULES = ['button-name', 'aria-required-children', 'landmark-unique', 'label']

// `elementRef` gives each node its element, so a node that stays through a tab
// change counts once.
const axe = configureAxe({
	resultTypes: ['violations'],
	runOnly: { type: 'rule', values: AXE_RULES },
	elementRef: true,
})

/**
 * What one walk of a page found. The smoke test reads `logged`, `violations`,
 * and `scopes`. The snippet gate reads `snippets`.
 */
export interface DemoWalk {
	/** What `console.error` and `console.warn` wrote, except during the harvest of the blocks. */
	readonly logged: readonly string[]
	/** What `console.error` and `console.warn` wrote while the walk opened and closed the blocks. */
	readonly harvestLogged: readonly string[]
	/** The count of the nodes that break each axe rule, keyed by rule. */
	readonly violations: Readonly<Record<string, number>>
	/** The longest chain of density scopes in a state, outermost first, as names. */
	readonly scopes: readonly string[]
	/** Each axis instance that shows its label no time or two times, as `example › label: why`. */
	readonly labelBreaks: readonly string[]
	/** The text of each "Show code" block, keyed by example title (or position). */
	readonly snippets: ReadonlyMap<string, string>
}

/** The text of each text node under an element that a reader sees, in document order. */
function textsOf(element: Element): string[] {
	const walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_TEXT)

	const texts: string[] = []

	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		// Text for a screen reader alone is not in sight.
		if (!node.parentElement?.closest('.sr-only')) texts.push(node.nodeValue ?? '')
	}

	return texts
}

/**
 * Each axis instance of `<Axes>` whose label a reader sees no time or two
 * times, as `example › label: why`. The content of an instance shows its label
 * in its text, or in the placeholder or the value of a field. An `aria-label`
 * does not count. An instance with a caption must not also show its label in
 * its content, and an instance with no caption must show it.
 */
function axisLabelBreaks(container: Element): string[] {
	const breaks: string[] = []

	for (const instance of container.querySelectorAll<HTMLElement>('[data-slot="axis-value"]')) {
		// A whole word: the label `On` is not in `Devon`.
		const escaped = (instance.dataset.label ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

		const label = new RegExp(`(^|\\W)${escaped}($|\\W)`, 'i')

		const content = [...instance.children].filter(
			(child) => child.getAttribute('data-slot') !== 'axis-caption',
		)

		const fields = content.flatMap((child) => [
			...child.querySelectorAll<HTMLInputElement>('input, textarea'),
			...(child.matches('input, textarea') ? [child as HTMLInputElement] : []),
		])

		// Each text node on its own: `textContent` joins `None` and `Action` into
		// `NoneAction`, which hides the whole word.
		const inText = content.flatMap(textsOf).some((text) => label.test(text))

		const inField = fields.some((field) => label.test(field.placeholder) || label.test(field.value))

		const captioned = instance.hasAttribute('data-caption')

		// A field can show a value of its own, such as a date format as its
		// placeholder, so only text doubles a caption.
		if (captioned ? !inText : inText || inField) continue

		const example = instance.closest('[data-slot="example"]')

		const where = `${(example && titleOf(example)) ?? 'untitled'} › ${instance.dataset.label}`

		breaks.push(`${where}: ${captioned ? 'shown twice' : 'not shown'}`)
	}

	return breaks
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

/** The title of an Example frame, or `null` for an untitled one. */
function titleOf(frame: Element): string | null {
	const head = frame.firstElementChild

	if (!head || head.getAttribute('data-slot') === 'example-frame') return null

	return head.querySelector('h3')?.textContent ?? null
}

/**
 * Renders a page, and opens each tab. In each state, it first reads the depth
 * of the density scopes and runs axe. It then opens each "Show code" block
 * that it did not read yet, reads the block, and closes the block again. Thus
 * axe in each later state reads the same DOM as a walk with no harvest.
 */
async function walk(page: string, load: () => Promise<ComponentType>): Promise<DemoWalk> {
	restoreRootAfterCase()

	const logged = captureConsole()

	const harvestLogged: string[] = []

	const Demo = await load()

	const { container } = render(
		<AppearanceProvider>
			<DemoApiContext value={demoApiOf(page)}>
				<Demo />
			</DemoApiContext>
		</AppearanceProvider>,
	)

	const violations = new Map<string, Set<Element>>()

	let deepest: Element[] = []

	const snippets = new Map<string, string>()

	const seenFrames = new WeakSet<Element>()

	const labelBreaks = new Set<string>()

	const inspect = async () => {
		for (const item of axisLabelBreaks(container)) labelBreaks.add(item)

		const chain = deepestScopeChain()

		if (chain.length > deepest.length) deepest = chain

		// A demo is a live page. Its timers and effects update it while axe runs,
		// so the run goes inside `act`.
		const results = await act(() => axe(document.body))

		for (const { id, nodes } of results.violations) {
			const elements = violations.get(id) ?? new Set()

			// The axe types leave out the `element` that `elementRef` adds.
			for (const node of nodes as ((typeof nodes)[number] & { element?: Element })[]) {
				if (node.element) elements.add(node.element)
			}

			violations.set(id, elements)
		}
	}

	const harvest = async () => {
		const frames = [...container.querySelectorAll('[data-slot="example"]')]

		for (const [index, frame] of frames.entries()) {
			if (seenFrames.has(frame)) continue

			seenFrames.add(frame)

			const trigger = within(frame as HTMLElement).queryAllByRole('button', {
				name: 'Show code',
			})[0]

			if (!trigger) continue

			// An Example can show a code block of its own, so the count of the blocks
			// before the open tells whether the close put the frame back.
			const blocks = frame.querySelectorAll('[data-slot="code-block"]').length

			await act(async () => {
				fireEvent.click(trigger)
			})

			const code = frame.querySelector('[data-slot="code-block"] code')?.textContent

			// The same trigger now reads "Hide code". The motion mock renders no exit,
			// so the panel unmounts at once. An open block adds nodes that axe reads,
			// so a block that stays open stops the walk.
			await act(async () => {
				fireEvent.click(trigger)
			})

			if (frame.querySelectorAll('[data-slot="code-block"]').length !== blocks) {
				throw new Error(`The "Show code" block of ${titleOf(frame) ?? `#${index + 1}`} stays open`)
			}

			if (!code) continue

			const base = titleOf(frame) ?? `#${index + 1}`

			let key = base

			for (let n = 2; snippets.has(key) && snippets.get(key) !== code; n += 1)
				key = `${base} (${n})`

			snippets.set(key, code)
		}
	}

	await visitTabs(container, async () => {
		await inspect()

		const before = logged.length

		await harvest()

		harvestLogged.push(...logged.splice(before))
	})

	const scopes = deepest.map(scopeName)

	cleanup()

	return {
		logged: [...logged],
		harvestLogged,
		violations: Object.fromEntries([...violations].map(([rule, set]) => [rule, set.size])),
		scopes,
		labelBreaks: [...labelBreaks],
		snippets,
	}
}

// The walk of each page that one gate read and the other gate did not read
// yet. The shuffle runs the cases of a file in any order, so the case that
// runs first walks the page, and the other case takes the result.
const walks = new Map<string, Promise<DemoWalk>>()

/**
 * The walk of `page` for one gate. The first call walks the page, and keeps the
 * result for the second call, which takes it and walks nothing. The result
 * holds no element, so a kept result keeps no page in memory.
 */
export async function walkOf(page: string, load: () => Promise<ComponentType>): Promise<DemoWalk> {
	const kept = walks.get(page)

	if (kept) {
		walks.delete(page)

		return kept
	}

	const walked = walk(page, load)

	walks.set(page, walked)

	return walked
}

/**
 * Put back the theme class and the density step that `AppearanceProvider`
 * writes to the root element and does not remove on unmount. The window is
 * shared across the files of a worker, so a step left on the root would reach
 * a later file that reads it.
 */
export function restoreRootAfterCase(): void {
	const root = document.documentElement

	const density = readRootDensity(root)

	const dark = root.classList.contains('dark')

	onTestFinished(() => {
		writeRootDensity(root, density)

		root.classList.toggle('dark', dark)
	})
}
