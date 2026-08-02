/**
 * The shared scenario harness for the jsdom suite: mount-plus-teardown benches
 * over a case list, and re-render benches that mount once and time the update
 * alone. The browser suite keeps its own harness — its contenders, sized hosts,
 * and paint-probe settle are a different measurement, not a variation of this
 * one.
 *
 * Every mount bench builds its element inside the timed region, the way a
 * consumer's render does, so `createElement` cost sits where React pays it.
 * Everything else a scenario needs — the fixtures, the columns, the sets —
 * belongs outside it.
 */

import { act, cleanup, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { bench } from 'vitest'

/** Re-renders a mounted tree in place; what {@link rerenderBench} hands its step. */
export type Rerender = (ui: ReactElement) => void

/**
 * Mounts a tree that stands for the whole run, and returns its container.
 *
 * @remarks Deliberately outside the testing library's registry. A scenario that
 * drives one mounted tree across every iteration — a hover cascade, a resize
 * burst — has to coexist with the mount benches beside it, and those end on
 * `cleanup()`, which unmounts *every* tree the library holds. Mounting here
 * through a bare root keeps the two lifetimes from reaching each other, so a
 * file can hold a persistent tree and still register mount benches through
 * {@link mountBench}.
 */
export function persistentTree(element: ReactElement): HTMLElement {
	const container = document.createElement('div')

	document.body.append(container)

	act(() => {
		createRoot(container).render(element)
	})

	return container
}

/** Registers one full mount-plus-teardown bench — the jsdom initial-render cost. */
export function mountBench(name: string, element: () => ReactElement) {
	bench(name, () => {
		render(element())

		cleanup()
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
	step: (rerender: Rerender, iteration: number) => void,
) {
	let rerender: Rerender = () => {}

	let iteration = 0

	bench(name, () => step(rerender, iteration++), {
		setup() {
			iteration = 0

			rerender = render(initial()).rerender
		},
		teardown() {
			cleanup()
		},
	})
}
