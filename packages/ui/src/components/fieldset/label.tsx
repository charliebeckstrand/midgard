'use client'

import { useComposedRefs } from 'motion/react'
import { type ComponentProps, type MouseEvent, type Ref, useEffect, useRef, useState } from 'react'
import { cn } from '../../core/cn'
import { composeEventHandlers } from '../../core/compose-event-handlers'
import { k } from '../../recipes/kata/fieldset'
import { FOCUSABLE_SELECTOR } from '../../utilities/focusable-selector'
import { useControl, useControlTargets } from '../control/context'

/**
 * Props for {@link Label}. As a `<label>` (the default): the optional `htmlFor` override (defaults
 * to the enclosing control id) plus the native `<label>` attributes. As a `<span>`: the native
 * `<span>` attributes, with no `htmlFor`.
 */
export type LabelProps =
	| ({
			/**
			 * The element. `label` names a labelable control; see {@link Label}.
			 * @defaultValue 'label'
			 */
			as?: 'label'
			className?: string
			htmlFor?: string
	  } & Omit<ComponentProps<'label'>, 'className'>)
	| ({
			/** The element. `span` gives the label style to text that is not a native label; see {@link Label}. */
			as: 'span'
			className?: string
			htmlFor?: never
	  } & Omit<ComponentProps<'span'>, 'className'>)

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
 * The labeled element is `label.control`. When the target of `htmlFor` is not labelable, it is
 * the element with that id.
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
 * control can name itself via `aria-labelledby`. Its type scale takes the step
 * of the nearest density scope.
 *
 * A press on the label keeps the focus on a control that already has it. The control does not
 * get a `blur` and a `focus` between `mousedown` and `click`. As on a native label, the `click`
 * focuses a control that does not have the focus.
 *
 * @remarks
 * Set `as="span"` when no labelable element has the id that the label points at. The labelable
 * elements are `<input>`, `<button>`, `<select>`, and `<textarea>`. Examples are a `<Rating>`, a
 * `<SignaturePad>`, or a list of inputs. A `<label for>` that points at no labelable element
 * names nothing, and the browser reports it as an incorrect use of `<label for>`. The `<span>`
 * has the same style and registers its id in the same way. Thus a control that reads
 * `aria-labelledby` from the field still takes its name from the text. The `<span>` takes no
 * press: it has no pointer cursor, and its text is selectable.
 *
 * Inside a `Form`, the label registers its text by the id of the control that it names. A
 * `FormErrorSummary` then names the field of each error with that text.
 */
export function Label(props: LabelProps) {
	const control = useControl()

	const id = props.id ?? control?.labelId

	// Registers while mounted; the field's `labelledBy` references this id only
	// while the Label renders.
	const registerLabel = control?.registerLabel

	useEffect(() => registerLabel?.(props.id), [registerLabel, props.id])

	const elementRef = useRef<HTMLElement>(null)

	const ref = useComposedRefs<HTMLElement>(elementRef, props.ref as Ref<HTMLElement> | undefined)

	// A form names the field of each error with the text of its label, by the
	// id of the control that the label names.
	const targets = useControlTargets()

	// The text that the label renders. It starts empty, so the hydration pass
	// matches the server markup.
	const [text, setText] = useState('')

	// After each commit, because a render can change the text. The effect writes
	// only a change, so it schedules no idle render. Outside a registry, no part
	// reads the text, so the effect reads nothing.
	useEffect(() => {
		if (!targets) return

		const next = elementRef.current?.textContent?.replace(/\s+/g, ' ').trim() ?? ''

		if (next !== text) setText(next)
	})

	const target = props.as === 'span' ? control?.id : (props.htmlFor ?? control?.id)

	useEffect(() => {
		if (!targets || !target || !text) return

		return targets.registerLabel(target, text)
	}, [targets, target, text])

	if (props.as === 'span') {
		const { as, className, id: _, ref: __, children, ...rest } = props

		return (
			<span
				id={id}
				ref={ref}
				className={cn(k({ as }).label, className)}
				{...rest}
				data-slot="label"
			>
				{children}
			</span>
		)
	}

	const { as, className, htmlFor, id: _, ref: __, onMouseDown, children, ...rest } = props

	return (
		<label
			id={id}
			ref={ref}
			htmlFor={htmlFor ?? control?.id}
			className={cn(k({ as }).label, className)}
			{...rest}
			data-slot="label"
			onMouseDown={composeEventHandlers(onMouseDown, keepControlFocus)}
		>
			{children}
		</label>
	)
}
