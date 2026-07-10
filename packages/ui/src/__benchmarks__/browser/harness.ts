/**
 * The shared scenario harness for the chart and map suites: a persistent
 * mount host, mount-plus-teardown benches, and mounted a/b update benches.
 * The grid suite keeps its own harness — its shared settle contract (paint
 * probes into the live DOM, sized hosts) is a different measurement, not a
 * variation of this one.
 */

import { bench } from 'vitest'
import type { Contender } from './contenders'

/** The slow scenarios see >100ms iterations; a longer window keeps samples up. */
export const SLOW = { time: 2_000 }

// One persistent host for the mount benches: every iteration mounts into it
// and tears back down, so scenarios never see each other's DOM.
const mountHost = document.createElement('div')

document.body.append(mountHost)

/** Registers one full mount-to-painted-DOM-plus-teardown bench per contender. */
export function mountBenches<D>(contenders: Contender<D>[], data: D, options?: { time: number }) {
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

/** A contender readied for its update bench: the report name and the timed run. */
export type PreparedBench = { name: string; run: () => void | Promise<void> }

/** Mounts every contender on dataset `a` and closes each over an a/b swap. */
export async function prepare<D>(contenders: Contender<D>[], a: D, b: D): Promise<PreparedBench[]> {
	const prepared: PreparedBench[] = []

	for (const contender of contenders) {
		const host = document.createElement('div')

		document.body.append(host)

		const mounted = await contender.mount(host, a)

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

/** Registers one bench per prepared contender. */
export function updateBenches(prepared: PreparedBench[], options?: { time: number }) {
	for (const { name, run } of prepared) {
		bench(name, run, options)
	}
}
