/**
 * The shared scenario harness for the jsdom suite: mount-plus-teardown benches
 * over a case list, and re-render benches that mount once and time the update
 * alone. The browser suite keeps its own harness — its contenders, sized hosts,
 * and paint-probe settle are a different measurement, not a variation of this
 * one.
 *
 * Every mount bench builds its element inside the timed region, the way a
 * consumer's render does, so `createElement` cost sits where React pays it.
 */

import { cleanup, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { type BenchOptions, bench } from 'vitest'

/** Re-renders a mounted tree in place; what {@link rerenderBench} hands its step. */
export type Rerender = (ui: ReactElement) => void

/** Registers one full mount-plus-teardown bench — the jsdom initial-render cost. */
export function mountBench(name: string, element: () => ReactElement, options?: BenchOptions) {
	bench(
		name,
		() => {
			render(element())

			cleanup()
		},
		options,
	)
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
	options?: BenchOptions,
) {
	for (const subject of cases) {
		mountBench(name(subject), () => element(subject), options)
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
	options?: BenchOptions,
) {
	let rerender: Rerender = () => {}

	let iteration = 0

	bench(name, () => step(rerender, iteration++), {
		...options,
		setup() {
			iteration = 0

			rerender = render(initial()).rerender
		},
		teardown() {
			cleanup()
		},
	})
}

/** A callback a scenario must supply but never fires — an opt-in flag, spelled honestly. */
export function noop() {}
