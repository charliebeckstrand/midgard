/**
 * The scenario harness of the grid suite. The chart and map suites settle on
 * the synchronous commit of the module (`harness.ts`). The grids settle on
 * paint evidence instead: each operation is timed until {@link painted} sees
 * the expected cell text in the live DOM. A grid that defers a part of its
 * DOM onto animation frames therefore pays for each frame that it defers.
 *
 * Each grid scenario mounts the same way: one fixed 960×600 host, a settled
 * first paint, then a drive for each iteration that the scenario supplies.
 */

import { type BenchOptions, bench } from 'vitest'
import type { Shipment } from '../fixtures'
import {
	GRID_HEIGHT,
	GRID_WIDTH,
	grids,
	type MountedGrid,
	type MountOptions,
	painted,
} from './grids'
import { host, type Prepared } from './harness'

/** The fixed box that each grid draws into, so each scenario paints the same viewport. */
const BOX = { width: GRID_WIDTH, height: GRID_HEIGHT }

/** The first and a mid-viewport row — evidence the visible window painted. */
export function viewportMarkers(rows: Shipment[]): string[] {
	return [rows[0]?.id ?? '', rows[8]?.id ?? '']
}

/**
 * Registers one full mount-to-painted-rows-plus-teardown bench for each grid.
 * `mount` sets how each grid mounts.
 */
export function mountGridBenches(rows: Shipment[], options?: BenchOptions, mount?: MountOptions) {
	const markers = viewportMarkers(rows)

	const mountHost = host(BOX)

	for (const subject of grids()) {
		bench(
			subject.name,
			async () => {
				const grid = subject.mount(mountHost, rows, mount)

				await painted(mountHost, markers)

				grid.destroy()
			},
			options,
		)
	}
}

/**
 * Mounts each grid on `rows` into its own fixed box, settles the first paint,
 * then closes each over the drive that `scenario` returns. `options` sets how
 * each grid mounts.
 */
export async function prepareGrids(
	rows: Shipment[],
	scenario: (grid: MountedGrid, box: HTMLElement) => () => Promise<void>,
	options?: MountOptions,
): Promise<Prepared[]> {
	const prepared: Prepared[] = []

	for (const subject of grids()) {
		const box = host(BOX)

		const grid = subject.mount(box, rows, options)

		await painted(box, [rows[0]?.id ?? ''])

		prepared.push({ name: subject.name, run: scenario(grid, box) })
	}

	return prepared
}
