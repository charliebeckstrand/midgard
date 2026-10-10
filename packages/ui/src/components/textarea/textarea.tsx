'use client'

import { type ComponentProps, type ReactNode, useRef } from 'react'
import { cn } from '../../core'
import type { ScaleStep } from '../../core/density'
import { useComposedRef } from '../../hooks/use-composed-ref'
import { ControlFrame } from '../../primitives/control'
import type { scale } from '../../recipes/kata/textarea'
import { k, type TextareaVariants } from '../../recipes/kata/textarea'
import type { ControlVariant } from '../control/context'
import { useInputControl } from '../input/use-input-control'
import { useTextareaAutoResize } from './use-textarea-auto-resize'

/** Props for {@link Textarea}: density `size`, `variant`, `autoResize`, an `actions` slot, an `invalid` override, and the remaining `<textarea>` surface. */
export type TextareaProps = Omit<TextareaVariants, 'size' | 'variant'> & {
	size?: ScaleStep<typeof scale>
	/**
	 * The surface of the control: `default` fills it, and `outline` draws a border
	 * with no fill. When the prop is unset, the textarea takes the variant of the
	 * enclosing Control. Without one, it takes the glass surface in a GlassProvider.
	 * @defaultValue 'default'
	 */
	variant?: ControlVariant
	className?: string
	/**
	 * Grow and shrink the field with its content. `rows` sets the minimum
	 * height, and a `max-height` class sets the maximum height.
	 * @defaultValue false
	 */
	autoResize?: boolean
	/** Control slot rendered as a right-justified row below the field; its presence pins `resize: none`. `null` and `false` count as absent. */
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
} & Omit<ComponentProps<'textarea'>, 'className' | 'size' | 'value' | 'rows'>

/**
 * Multi-line text control with optional `autoResize` and an `actions` slot.
 * Resolves variant and binding from enclosing `<Form>`, `<Control>`, and
 * `<GlassProvider>` contexts, and takes the step of the nearest density scope.
 * Under headless context, it drops to a bare `<textarea>`.
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
 * A set `size` opens a density scope. The actions row gets the affix size, one
 * step below the textarea, as the Input affixes do. Under headless context the
 * frame, the recipe classes, and the actions row are all skipped.
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
	...rest
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

	const composedRef = useComposedRef(fieldRef, ref)

	useTextareaAutoResize(fieldRef, autoResize)

	// Under headless context the actions row is not rendered, so it sets no layout.
	// An absent slot (`undefined`, `null`, or `false`) renders no row either.
	const hasActions = !field.headless && actions != null && actions !== false

	const textareaEl = (
		<textarea
			data-slot="textarea"
			ref={composedRef}
			{...field.attrs}
			rows={rows}
			className={cn(
				!field.headless &&
					k({
						variant: field.variant,
						resize: hasActions ? 'none' : resize,
					}),
				hasActions && k.bare,
				className,
			)}
			{...rest}
		/>
	)

	if (field.headless) return textareaEl

	return (
		<ControlFrame
			density={size}
			className={cn(hasActions && k.frame, k.surface({ variant: field.variant }))}
		>
			{textareaEl}
			{/* The ControlFrame is a `<span>`, so the actions row is a `<span>` too. */}
			{hasActions && (
				<span data-slot="textarea-actions" data-density="slot" className={cn(k.actions)}>
					{actions}
				</span>
			)}
		</ControlFrame>
	)
}
