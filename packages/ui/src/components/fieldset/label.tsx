'use client'

import { type ComponentProps, type MouseEvent, useEffect } from 'react'
import { cn, composeEventHandlers } from '../../core'
import { k } from '../../recipes/kata/fieldset'
import { FOCUSABLE_SELECTOR } from '../../utilities'
import { useControl } from '../control/context'

/**
 * Props for {@link Label}: the optional `htmlFor` override (defaults to the
 * enclosing control id) plus the native `<label>` attributes.
 */
export type LabelProps = {
	className?: string
	htmlFor?: string
} & Omit<ComponentProps<'label'>, 'className'>

/**
 * Keeps the focus on the labeled control through a press on its label.
 *
 * @remarks
 * A `<label>` is not focusable. Thus the `mousedown` default of a press on the label text moves
 * the focus to the body, and the `click` that follows moves the focus back to the control. The
 * control gets a `blur` and a `focus` that the user did not ask for. This handler cancels that
 * default only while the control, or an element in it, has the focus. The native `click`
 * activation still focuses the control, and a press that starts on the label and ends outside
 * it does not focus the control.
 *
 * The labeled element is `label.control`. When the target of `htmlFor` is not labelable (the
 * `<div>` root of `RangeSlider`), it is the element with that id.
 *
 * @internal
 */
function keepControlFocus(event: MouseEvent<HTMLLabelElement>) {
	const label = event.currentTarget

	const target = event.target instanceof Element ? event.target : null

	// A press on a focusable element in the label (a wrapped input, a link) keeps its default,
	// so that it can place the caret or take the focus.
	const hit = target?.closest(FOCUSABLE_SELECTOR)

	if (hit && label.contains(hit)) return

	const doc = label.ownerDocument

	const labeled = label.control ?? (label.htmlFor ? doc.getElementById(label.htmlFor) : null)

	const active = doc.activeElement

	if (labeled && active && labeled.contains(active)) event.preventDefault()
}

/**
 * Caption for a single form control, rendered as a `<label>`. Defaults `htmlFor`
 * to the enclosing `<Field>`/`<Control>` id, and registers its own id so the
 * control can name itself via `aria-labelledby`. Resolves type scale from the
 * Density cascade.
 *
 * A press on the label keeps the focus on a control that already has it. The control does not
 * get a `blur` and a `focus` between `mousedown` and `click`. As on a native label, the `click`
 * focuses a control that does not have the focus.
 */
export function Label({ className, htmlFor, id, onMouseDown, ...props }: LabelProps) {
	const control = useControl()

	// Registers while mounted; the field's `labelledBy` references this id only
	// while the Label renders.
	const registerLabel = control?.registerLabel

	useEffect(() => registerLabel?.(id), [registerLabel, id])

	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: htmlFor is passed by the consumer or the label wraps its control
		<label
			data-slot="label"
			id={id ?? control?.labelId}
			htmlFor={htmlFor ?? control?.id}
			className={cn(k.label(), className)}
			{...props}
			onMouseDown={composeEventHandlers(onMouseDown, keepControlFocus)}
		/>
	)
}
