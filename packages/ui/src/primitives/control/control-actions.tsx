'use client'

import type { ComponentProps } from 'react'
import { composeEventHandlers } from '../../core/compose-event-handlers'
import { HeadlessShell } from '../headless/headless-shell'
import { keepFocusOnPress } from './control-keep-focus-on-press'

/** Props for {@link ControlActions}: the standard `span` attributes. */
export type ControlActionsProps = ComponentProps<'span'>

/**
 * A row of controls inside the frame of a form control, such as the actions
 * row below a Textarea or a Wysiwyg field. The frame looks like one field, so
 * a press on a button in the row, or on the empty part of the row, does not
 * move the focus. The button still gets the click, and the Tab key still moves the
 * focus to the buttons.
 *
 * @remarks
 * The row cancels the default of such a `mousedown`. A press on another
 * control, such as a `<select>`, keeps its default, because that control opens
 * or takes text on the press. The ControlFrame is a `<span>`, so the row is a
 * `<span>` too. Under `<HeadlessProvider>`, the row renders its children
 * alone, with no element to hold the guard. The consumer owns the structure
 * there, so it cancels the `mousedown` on its own buttons if it needs to.
 */
export function ControlActions({ onMouseDown, children, ...props }: ControlActionsProps) {
	return (
		<HeadlessShell
			data-slot="control-actions"
			data-density="slot"
			{...props}
			onMouseDown={composeEventHandlers(onMouseDown, keepFocusOnPress)}
		>
			{children}
		</HeadlessShell>
	)
}
