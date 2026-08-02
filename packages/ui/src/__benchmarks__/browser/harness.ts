/**
 * The shared scenario harness for the competitive browser suite: hosts, frame
 * settling, pointer sweeps, mount-plus-teardown benches, and mounted a/b
 * update benches. Every suite in this directory registers through
 * {@link benches}, so a scenario declares its contenders and its settle
 * contract and nothing else.
 *
 * The grid suite prepares through `grid-harness.ts` rather than {@link prepare}
 * — its paint-probe settle over sized hosts is a different measurement, not a
 * variation of this one — but it registers through the same {@link benches}.
 */

import type { ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { type BenchOptions, bench } from 'vitest'
import type { Contender } from './contenders'

/**
 * Sample windows for scenarios whose iterations outrun Vitest's 500ms default.
 * A window that takes only ten-odd samples swings run to run — enough to read a
 * genuine tie as a loss — so the heavy scenarios widen it to buy the sample
 * count their iteration cost denies them. The jsdom suite needs none of this:
 * its benches take the default window, so the two windows live here rather than
 * at the shared root.
 */
export const WINDOW = {
	/** Heavy single-shot iterations — mounts, updates, sorts, resizes. */
	slow: { time: 2_000 },
	/** Many-frame settled iterations — pointer sweeps, emphasis flips, scroll round trips. */
	settled: { time: 2_500 },
} as const

/** One prepared contender: the report name and the timed run. */
export type Prepared = { name: string; run: () => void | Promise<void> }

/** One animation frame — the browser's own settle unit. */
export const frame = () => new Promise(requestAnimationFrame)

/** Settles `count` frames, for work a library defers past the first one. */
export async function settle(count = 2) {
	for (let index = 0; index < count; index++) await frame()
}

/** A fresh document-attached host, sized on whichever axes the scenario fixes. */
export function host(size?: { width?: number; height?: number }): HTMLElement {
	const element = document.createElement('div')

	if (size?.width !== undefined) element.style.width = `${size.width}px`

	if (size?.height !== undefined) element.style.height = `${size.height}px`

	document.body.append(element)

	return element
}

/**
 * A React root over a fresh host. `render` and `flush` commit synchronously,
 * the way a consumer's interaction handler pays for a commit, and `destroy`
 * unmounts then removes the host — a hard teardown, so an exit animation never
 * holds cleanup open past the timed region.
 */
export function reactHost(size?: { width?: number; height?: number }) {
	const box = host(size)

	const root = createRoot(box)

	return {
		render: (ui: ReactNode) => flushSync(() => root.render(ui)),
		/** Commits a state update the mounted tree owns, synchronously. */
		flush: (update: () => void) => flushSync(update),
		destroy: () => {
			root.unmount()

			box.remove()
		},
	}
}

// One persistent host for the mount benches: every iteration mounts into it
// and tears back down, so scenarios never see each other's DOM.
const mountHost = host()

/** Registers one full mount-to-painted-DOM-plus-teardown bench per contender. */
export function mountBenches<D>(contenders: Contender<D>[], data: D, options?: BenchOptions) {
	for (const contender of contenders) {
		bench(
			contender.name,
			async () => {
				const mounted = await contender.mount(mountHost, data)

				mounted.destroy()
			},
			options,
		)
	}
}

/** Mounts every contender on dataset `a` and closes each over an a/b swap. */
export async function prepare<D>(contenders: Contender<D>[], a: D, b: D): Promise<Prepared[]> {
	const prepared: Prepared[] = []

	for (const contender of contenders) {
		const mounted = await contender.mount(host(), a)

		let flip = false

		prepared.push({
			name: contender.name,
			run: () => {
				flip = !flip

				return mounted.update(flip ? b : a)
			},
		})
	}

	return prepared
}

/** Registers one bench per prepared contender, in the report's fixed order. */
export function benches(prepared: Prepared[], options?: BenchOptions) {
	for (const { name, run } of prepared) {
		bench(name, run, options)
	}
}

/** Steps in a pointer sweep — enough that per-move work accumulates past the settled frame. */
export const SWEEP = 20

/**
 * The {@link SWEEP} x positions across `rect`, inset from both edges so the
 * sweep stays inside the plot rather than skimming its border.
 */
function sweepXs(rect: DOMRect): number[] {
	return Array.from(
		{ length: SWEEP },
		(_, step) => rect.left + 40 + ((rect.width - 60) * step) / (SWEEP - 1),
	)
}

/**
 * Dispatches the `pointermove` + `mousemove` pair at one point. Each library
 * listens for one of the two and ignores the other, so sending both keeps the
 * dispatch overhead symmetric across their differing interaction stacks.
 */
function pointerAt(target: Element, x: number, y: number) {
	const at = { bubbles: true, clientX: x, clientY: y }

	target.dispatchEvent(new PointerEvent('pointermove', { ...at, pointerType: 'mouse' }))

	target.dispatchEvent(new MouseEvent('mousemove', at))
}

/**
 * Mounts every contender and closes each over a {@link SWEEP}-step pointer
 * sweep across its own plot, settling one frame so frame-deferred drawing
 * lands inside the timed region.
 *
 * @param plot - The element the library draws into and listens on.
 * @param targets - The per-step dispatch target, where a contender renders its
 * own hit targets rather than hit-testing from coordinates; the plot itself by
 * default. Resolved once, outside the timed region, so the geometry reads that
 * resolution needs never enter a sample.
 */
export async function prepareSweep<D>(
	contenders: Contender<D>[],
	data: D,
	plot: (host: HTMLElement) => Element,
	targets?: (box: HTMLElement, xs: number[], y: number) => Element[],
): Promise<Prepared[]> {
	const prepared: Prepared[] = []

	for (const contender of contenders) {
		const box = host()

		await contender.mount(box, data)

		const surface = plot(box)

		const rect = surface.getBoundingClientRect()

		const y = rect.top + rect.height / 2

		const xs = sweepXs(rect)

		const steps = targets?.(box, xs, y) ?? xs.map(() => surface)

		prepared.push({
			name: contender.name,
			run: async () => {
				for (const [step, x] of xs.entries()) {
					pointerAt(steps[step] as Element, x, y)
				}

				await frame()
			},
		})
	}

	return prepared
}
