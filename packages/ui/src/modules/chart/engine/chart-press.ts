import type { MouseEvent } from 'react'
import type { ChartPress } from './types'

/** The press of Enter or Space on a keyboard stop. @internal */
export const KEY_PRESS: ChartPress = { pointerType: 'keyboard', count: 1 }

/**
 * The press of a click of a mouse or a pen. The browser counts the clicks of a
 * run in `detail`. A click that no press made, such as `element.click()`,
 * counts 0, so it counts as one click. The click of a touch never reaches
 * here: the tap reports it (see `tapPress`). The marks of a chart or a map take
 * no focus, so a key makes no click on them: Enter and Space pick through the
 * keyboard cursor, with {@link KEY_PRESS}.
 *
 * @internal
 */
export function clickPress(event: MouseEvent): ChartPress {
	const { pointerType } = event.nativeEvent as Partial<PointerEvent>

	return { pointerType: pointerType === 'pen' ? 'pen' : 'mouse', count: Math.max(1, event.detail) }
}

/** The press of a touch tap, the `count`th of its run (see `useTouchTap`). @internal */
export function tapPress(count: number): ChartPress {
	return { pointerType: 'touch', count }
}
