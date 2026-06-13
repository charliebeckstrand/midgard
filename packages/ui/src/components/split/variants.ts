import type { Ma } from '../../recipes'
import { k } from '../../recipes/kata/split'
import type { Orientation } from '../../types'
import { alignMap, type FlexAlign } from '../flex/variants'

export { alignMap }

export type SplitAlign = FlexAlign

/** Gap step between the two panes, drawn from the shared `Ma` spacing scale. */
export type SplitGap = Ma

export const gapMap = k.gap

export const ratioTuples = {
	'1/4': [1, 3],
	'1/3': [1, 2],
	'1/2': [1, 1],
	'2/3': [2, 1],
	'3/4': [3, 1],
} as const

/** First-pane-to-second-pane size ratio (e.g. `'1/3'`, `'1/2'`, `'2/3'`). */
export type SplitRatio = keyof typeof ratioTuples
/** Whether the panes lay out as columns (`horizontal`) or rows (`vertical`). */
export type SplitOrientation = Orientation
