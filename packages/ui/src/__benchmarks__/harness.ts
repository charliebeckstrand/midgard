/**
 * The shared scenario harness for the jsdom suite: mount-plus-teardown benches
 * over a case list, re-render benches that mount once and time the update
 * alone, and the bench-lifetime mount the cascade scenarios drive. The browser
 * suite keeps its own harness — its contenders, sized hosts, and paint-probe
 * settle are a different measurement, not a variation of this one.
 *
 * Every mount bench builds its element inside the timed region, the way a
 * consumer's render does, so `createElement` cost sits where React pays it.
 * Everything else a scenario needs — the fixtures, the columns, the element
 * trees — belongs outside it.
 */

import { act } from '@testing-library/react'
import type { ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { bench } from 'vitest'

/** A tree this harness owns: its own container, its own teardown. */
type Mounted = {
	container: HTMLElement
	rerender: (ui: ReactElement) => void
	unmount: () => void
}

/**
 * Mounts `element` into a container of its own.
 *
 * @remarks Deliberately not the testing library's `render`. That one registers
 * every tree in a module-level set which only `cleanup()` clears — and
 * `cleanup()` unmounts *all* of them, so a mount bench beside a scenario that
 * drives one tree for the whole run would tear that tree down mid-measurement.
 * Its `unmount()` is no escape either: it leaves both the container and the
 * registry entry behind, leaking a div per iteration. Owning the root gives
 * each tree a teardown that reaches exactly itself, which is what lets
 * {@link mountBench} and {@link persistentTree} coexist in one file.
 *
 * `act` still comes from the testing library — it manages the React act
 * environment flag that the bench setup does not set.
 */
function mount(element: ReactElement): Mounted {
	const container = document.createElement('div')

	document.body.append(container)

	const root = createRoot(container)

	act(() => {
		root.render(element)
	})

	return {
		container,
		rerender: (ui) => {
			act(() => {
				root.render(ui)
			})
		},
		unmount: () => {
			act(() => {
				root.unmount()
			})

			container.remove()
		},
	}
}

/**
 * A tree that one or more benches drive across every iteration (a hover
 * cascade, a resize burst), rather than remounting per sample. Each bench
 * registered through `bench` mounts its own copy of the tree in its cycle
 * setup, runs `prepare` on the container, and tears the tree down in its cycle
 * teardown. The timed body gets the prepared state.
 *
 * @remarks The tree mounts only while its own bench runs. A tree that mounted
 * at collection time stayed in the one document for the whole file, so each
 * figure depended on what else the file mounted. Now the figures in one file
 * are independent of each other.
 *
 * `prepare` runs after the mount and outside the timed region. Put there the
 * lookups and the start state that the timed body needs, such as the cells to
 * move between or an open session.
 */
export function persistentTree<S>(
	element: ReactElement,
	prepare: (container: HTMLElement) => S,
): { bench: (name: string, fn: (state: S) => void) => void } {
	return {
		bench(name, fn) {
			let mounted: Mounted | null = null

			let state: S | undefined

			bench(name, () => fn(state as S), {
				setup() {
					mounted = mount(element)

					state = prepare(mounted.container)
				},
				teardown() {
					mounted?.unmount()

					mounted = null

					state = undefined
				},
			})
		},
	}
}

/**
 * Mounts a tree at collection time, for the whole run of the file, and returns
 * its container. Several benches can drive the same mount.
 *
 * @remarks Prefer {@link persistentTree}. A tree here stays in the one document
 * while every other bench of the file runs, so it changes their figures. Only a
 * file that shares its mounts on purpose uses this.
 */
export function sharedTree(element: ReactElement): HTMLElement {
	return mount(element).container
}

/** Registers one full mount-plus-teardown bench — the jsdom initial-render cost. */
export function mountBench(name: string, element: () => ReactElement) {
	bench(name, () => {
		mount(element()).unmount()
	})
}

/**
 * Registers one mount bench per case — the by-size or by-flag sweep most
 * scenarios take, so a scenario declares its axis once instead of repeating
 * the render body per rung.
 */
export function mountBenches<C>(
	cases: readonly C[],
	name: (subject: C) => string,
	element: (subject: C) => ReactElement,
) {
	for (const subject of cases) {
		mountBench(name(subject), () => element(subject))
	}
}

/**
 * Registers a bench that times re-render alone: `initial` mounts in the cycle
 * setup, the timed body drives `step` with the rerender handle and a
 * monotonic iteration counter, and the tree tears down in the cycle teardown.
 *
 * @remarks The mount lands outside the timed region, so a regression here is a
 * reconciliation regression — the one place a dropped memo surfaces unmixed
 * with mount cost.
 */
export function rerenderBench(
	name: string,
	initial: () => ReactElement,
	step: (rerender: Mounted['rerender'], iteration: number) => void,
) {
	let mounted: Mounted | null = null

	let iteration = 0

	bench(name, () => step((ui) => mounted?.rerender(ui), iteration++), {
		setup() {
			iteration = 0

			mounted = mount(initial())
		},
		teardown() {
			mounted?.unmount()

			mounted = null
		},
	})
}

/**
 * The geometry a bench models for a windowed list in jsdom, which lays nothing
 * out. `isScroller` picks the scroll container, and `rowHeight` gives each
 * other element its height. `scrollHeight`, when given, gives the scroller its
 * content height, and a scroll write then clamps to it.
 */
export type LayoutModel = {
	isScroller: (element: HTMLElement) => boolean
	viewport: number
	width: number
	rowHeight: (element: HTMLElement) => number
	scrollHeight?: (element: HTMLElement) => number
}

/** The scroll offset of each element, as the modeled layout stores it. */
const modeledOffsets = new WeakMap<Element, number>()

/**
 * Gives a windowed list the geometry a browser would, on the prototype of
 * every element in the file.
 *
 * @remarks The model is small on purpose. The scroller has a fixed viewport,
 * and each row has the height the model names. A scroll write stores the
 * offset and fires `scroll` in a microtask, which is the event the virtualizer
 * reads. A browser fires `scroll` after the write, never inside it. The event
 * re-renders the window, so it goes through `act` as a mount does. The model
 * patches `HTMLElement.prototype`, so a file that calls it measures nothing
 * else against the plain jsdom layout.
 */
export function modelLayout(model: LayoutModel): void {
	const define = (key: string, get: (element: HTMLElement) => number) => {
		Object.defineProperty(HTMLElement.prototype, key, {
			configurable: true,
			get(this: HTMLElement) {
				return get(this)
			},
		})
	}

	define('offsetHeight', (element) =>
		model.isScroller(element) ? model.viewport : model.rowHeight(element),
	)

	define('offsetWidth', (element) => (model.isScroller(element) ? model.width : 0))

	define('clientHeight', (element) => (model.isScroller(element) ? model.viewport : 0))

	const { scrollHeight } = model

	if (scrollHeight) {
		define('scrollHeight', (element) => (model.isScroller(element) ? scrollHeight(element) : 0))
	}

	Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
		configurable: true,
		get(this: HTMLElement) {
			return modeledOffsets.get(this) ?? 0
		},
		set(this: HTMLElement, value: number) {
			modeledOffsets.set(this, value)
		},
	})

	HTMLElement.prototype.scrollTo = function scrollTo(this: HTMLElement, options?: ScrollToOptions) {
		const top = Math.max(options?.top ?? 0, 0)

		const max = scrollHeight ? Math.max(this.scrollHeight - this.clientHeight, 0) : top

		this.scrollTop = Math.min(top, max)

		queueMicrotask(() => act(() => void this.dispatchEvent(new Event('scroll'))))
	} as HTMLElement['scrollTo']
}
