import type { ReactNode } from 'react'

/**
 * The `display: contents` frame that {@link DatePicker} gives its picker, for
 * the custom Start and End pickers of the relative arm. While
 * open, the modal focus manager of floating-ui inserts a hidden return-focus
 * span as the next sibling of the reference
 * (`domReference.insertAdjacentElement('afterend', …)`). The frame holds that
 * span, so the picker stays a single DOM child of its parent, and the margin of
 * a `space-y` container does not shift the layout when the popover opens.
 * `contents` adds no box of its own, so a flex, grid, or block layout reads the
 * control as before.
 *
 * @internal
 */
export function DatePickerFrame({ children }: { children: ReactNode }) {
	return (
		<div data-slot="datepicker" className="contents">
			{children}
		</div>
	)
}
