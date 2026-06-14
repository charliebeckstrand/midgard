import type { Orientation } from '../../types'

/**
 * Layout axis of a {@link ResizableGroup}: `horizontal` lays panels in a row,
 * `vertical` in a column.
 *
 * @internal
 */
export type ResizableOrientation = Orientation

/**
 * Resolved size constraints for one panel, in percentages of the group, read
 * from {@link ResizablePanel} props.
 *
 * @internal
 */
export type PanelConfig = {
	defaultSize: number
	minSize: number
	maxSize: number
}
