import { frozenLayout } from '../../modules/grid/engine/grid-pin/layout'
import type { FrozenOffsets } from '../../modules/grid/engine/grid-pin/measure'

/** One frozen column: its id and its width. */
export type Pin = [id: string, width: number]

/**
 * Gives the layout of two frozen sections, each in edge order. The offsets and
 * the boundary come from the place of each column in its section, which is the
 * derivation under test.
 *
 * @remarks
 * The module reads no DOM, so the `geometry` project and the jsdom suites can
 * both import it.
 */
export function layoutOf(left: Pin[], right: Pin[] = [], measured: FrozenOffsets | null = null) {
	return frozenLayout(
		{ left: left.map(([id]) => id), right: right.map(([id]) => id) },
		new Map([...left, ...right]),
		measured,
	)
}
