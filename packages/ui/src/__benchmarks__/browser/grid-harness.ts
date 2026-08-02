/**
 * The grid suite's scenario harness. The chart and map suites settle on each
 * library's own contract (`harness.ts`); the grids settle on shared paint
 * evidence instead — every operation is timed until {@link painted} sees the
 * expected cell text in the live DOM — so a library that defers row DOM onto
 * animation frames pays for exactly the frames it defers, and none is trusted
 * about its own "ready" signal.
 *
 * Every grid scenario therefore mounts the same way: one fixed 960×600 host
 * per contender, a settled first paint, then a per-iteration drive the
 * scenario supplies. A contender whose tier cannot run a scenario — MUI's MIT
 * pagination has no full-set scroller — returns no drive and sits it out.
 */

import { type BenchOptions, bench } from 'vitest'
import type { Shipment } from '../fixtures'
import {
	GRID_HEIGHT,
	GRID_WIDTH,
	gridContenders,
	type MountedGrid,
	painted,
} from './grid-contenders'
import { host, type Prepared } from './harness'

/** The fixed box every grid draws into, so no contender wins by rendering fewer cells. */
const BOX = { width: GRID_WIDTH, height: GRID_HEIGHT }

/** The first and a mid-viewport row — evidence the visible window painted. */
export function viewportMarkers(rows: Shipment[]): string[] {
	return [rows[0]?.id ?? '', rows[8]?.id ?? '']
}

/** Registers one full mount-to-painted-rows-plus-teardown bench per contender. */
export function mountGridBenches(rows: Shipment[], options?: BenchOptions) {
	const markers = viewportMarkers(rows)

	const mountHost = host(BOX)

	for (const contender of gridContenders()) {
		bench(
			contender.name,
			async () => {
				const grid = contender.mount(mountHost, rows)

				await painted(mountHost, markers)

				grid.destroy()
			},
			options,
		)
	}
}

/**
 * Mounts every contender on `rows` into its own fixed box, settles the first
 * paint, then closes each over the drive `scenario` returns. A contender the
 * scenario cannot run returns `null` and leaves the report.
 */
export async function prepareGrids(
	rows: Shipment[],
	scenario: (grid: MountedGrid, box: HTMLElement) => (() => Promise<void>) | null,
): Promise<Prepared[]> {
	const prepared: Prepared[] = []

	for (const contender of gridContenders()) {
		const box = host(BOX)

		const grid = contender.mount(box, rows)

		await painted(box, [rows[0]?.id ?? ''])

		const run = scenario(grid, box)

		if (!run) {
			box.remove()

			continue
		}

		prepared.push({ name: contender.name, run })
	}

	return prepared
}
