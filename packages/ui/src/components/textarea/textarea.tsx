'use client'

import { useComposedRefs } from 'motion/react'
import { type ComponentProps, type MouseEvent, type ReactNode, useRef } from 'react'
import { cn } from '../../core/cn'
import type { ScaleStep } from '../../core/density/scale'
import { ControlFrame } from '../../primitives/control'
import { HeadlessShell } from '../../primitives/headless/headless-shell'
import { useHeadlessSlots } from '../../primitives/headless/use-headless-slots'
import type { scale } from '../../recipes/kata/textarea'
import { k, type TextareaVariants } from '../../recipes/kata/textarea'
import type { ControlVariant } from '../control/context'
import { useInputControl } from '../input/use-input-control'
import { TextareaGrip } from './textarea-grip'
import { useTextareaAutoResize } from './use-textarea-auto-resize'

/** Props for {@link Textarea}: density `size`, `variant`, `autoResize`, an `actions` slot, an `invalid` override, and the remaining `<textarea>` surface. */
export type TextareaProps = Omit<TextareaVariants, 'size' | 'variant'> & {
	size?: ScaleStep<typeof scale>
	/**
	 * The surface of the control: `default` fills it, `outline` draws a border
	 * with no fill, `soft` fills it with a translucent wash and no border, and
	 * `bare` draws neither ({@link ControlVariant}). When the
	 * prop is unset, the textarea takes the variant of the enclosing Control.
	 * Without one, it takes the glass surface in a GlassProvider. A `bare`
	 * field has no inset, so a field of one row is one line of text.
	 * @defaultValue 'default'
	 */
	variant?: ControlVariant
	/**
	 * Grows and shrinks the field with its content. `rows` sets the minimum
	 * height, and a `max-height` class sets the maximum height.
	 * @defaultValue false
	 */
	autoResize?: boolean
	/**
	 * Control slot rendered as a right-justified row below the field; its
	 * presence pins `resize: none`. `null` and `false` count as absent. A press
	 * on a button in the row does not move the focus, and the button still
	 * gets the click. Under `<HeadlessProvider>`, there is no row, so a press
	 * moves the focus as usual.
	 */
	actions?: ReactNode
	/**
	 * Forces the invalid state. When omitted, inherits from Control / Form context.
	 * @defaultValue `false`, or `true` when the bound form field has an error or the enclosing Control has the `error` severity.
	 */
	invalid?: boolean
	/** Controlled value. `undefined` leaves the textarea uncontrolled; `null` keeps it controlled with no current value (CONVENTIONS §7.3). */
	value?: ComponentProps<'textarea'>['value'] | null
	/**
	 * The visible height in lines. With `autoResize`, it is the minimum height.
	 * @defaultValue 3
	 */
	rows?: ComponentProps<'textarea'>['rows']
} & Omit<ComponentProps<'textarea'>, 'size' | 'value' | 'rows'>

/**
 * Multi-line text control with optional `autoResize` and an `actions` slot.
 * Resolves variant and binding from enclosing `<Form>`, `<Control>`, and
 * `<GlassProvider>` contexts, and takes the step of the nearest density scope.
 * Under headless context, the textarea and its actions render bare, with no
 * frame and no classes.
 *
 * @remarks Shares the control setup of Input through {@link useInputControl},
 * including the §7.3 value contract that `useInputValue` owns. `defaultValue`
 * reaches the element only while the textarea is uncontrolled, so a bound
 * textarea ignores it.
 * With `autoResize`, the textarea measures its content before paint, on each
 * input, and when its width changes. It does not use `field-sizing: content`,
 * because that property ignores `rows` and is not in each browser at the
 * floor. With `actions`, the frame stacks the field above a right-justified
 * actions row.
 * A press on a button in the actions row cancels the default of its
 * `mousedown`, so the focus stays where it was. Thus a press does not show the
 * focus ring of the frame, and it does not take the focus from the field.
 * The Tab key still moves the focus to the buttons. Under
 * `<HeadlessProvider>`, the row renders no element to hold this guard. The
 * consumer owns the structure there, so it cancels the `mousedown` on its
 * own buttons if it needs to.
 * With `resize`, a touch device gets a grip of its own on the edge that the
 * drag moves, because Safari on iOS and iPadOS draws no native grip.
 * A set `size` opens a density scope. The actions row gets the affix size, one
 * step below the textarea, as the Input affixes do.
 * `invalid` forces the validation state on or off. When omitted, the state
 * comes from the bound field and an enclosing Control, as on Input.
 */
export function Textarea({
	className,
	variant,
	size,
	resize,
	autoResize = false,
	actions,
	id,
	autoComplete,
	disabled,
	required,
	readOnly,
	invalid,
	name,
	value,
	defaultValue,
	onChange,
	onBlur,
	rows = 3,
	ref,
	'aria-describedby': ariaDescribedBy,
	...props
}: TextareaProps) {
	const field = useInputControl<HTMLTextAreaElement>({
		id,
		name,
		autoComplete,
		disabled,
		required,
		readOnly,
		invalid,
		variant,
		value,
		defaultValue,
		onChange,
		onBlur,
		'aria-describedby': ariaDescribedBy,
	})

	const fieldRef = useRef<HTMLTextAreaElement>(null)

	const composedRef = useComposedRefs(fieldRef, ref)

	useTextareaAutoResize(fieldRef, autoResize)

	// An absent slot (`undefined`, `null`, or `false`) renders no row.
	const hasActions = actions != null && actions !== false

	const axis = hasActions ? 'none' : (resize ?? 'none')

	const slots = useHeadlessSlots(k, {
		variant: field.variant,
		resize: axis,
		actions: hasActions,
	})

	const textarea = (
		<textarea
			data-slot="textarea"
			ref={composedRef}
			rows={rows}
			{...props}
			// The bound field state comes after the rest props (§3.9). Thus a stray
			// `aria-invalid` or `id` cannot change the state of a bound field.
			{...field.attrs}
			className={cn(slots.field, className)}
		/>
	)

	return (
		<ControlFrame density={size} className={cn(slots.base)}>
			{textarea}
			{axis !== 'none' && <TextareaGrip field={fieldRef} axis={axis} className={cn(slots.grip)} />}
			{/* The ControlFrame is a `<span>`, so the actions row is a `<span>` too. */}
			{hasActions && (
				<HeadlessShell
					data-slot="textarea-actions"
					data-density="slot"
					className={cn(slots.actions)}
					onMouseDown={keepFocusOnPress}
				>
					{actions}
				</HeadlessShell>
			)}
		</ControlFrame>
	)
}

/**
 * Cancels the focus move of a press in the actions row: on a button, or on the
 * gap between the actions. The frame looks like one field, so the focus stays
 * in the textarea. The click still fires. A press on a field, such as a
 * `<select>`, keeps its default, because that field opens or takes text on the
 * press.
 */
function keepFocusOnPress(event: MouseEvent<HTMLElement>) {
	if (!(event.target instanceof Element)) return

	const field = event.target.closest('input, select, textarea')

	if (field && event.currentTarget.contains(field)) return

	event.preventDefault()
}
