import type { ChartPress } from '../../modules/chart'

/** The press of one mouse click. */
export const CLICK: ChartPress = { pointerType: 'mouse', count: 1 }

/** The press of Enter or Space on a keyboard stop. */
export const KEY: ChartPress = { pointerType: 'keyboard', count: 1 }

/** The press of one touch tap. */
export const TAP: ChartPress = { pointerType: 'touch', count: 1 }
