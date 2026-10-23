'use client'

import { type ComponentProps, type Ref, useCallback } from 'react'
import { ariaAttr, cn, dataAttr } from '../../core'
import { defineMessage, defineMessages, intlMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/signature-pad'
import { clamp } from '../../utilities'
import { Button } from '../button'
import { type SignaturePadHandle, useSignaturePadState } from './use-signature-pad-state'

const messages = defineMessages({
	placeholder: {
		id: 'ui.signaturePad.placeholder',
		defaultMessage: 'Sign here',
		description: 'The text over an empty signature pad that asks the reader to draw a signature.',
	},
	label: {
		id: 'ui.signaturePad.label',
		defaultMessage: 'Signature',
		description: 'The name of the canvas of a signature pad, when no label names it.',
	},
	clear: {
		id: 'ui.signaturePad.clear',
		defaultMessage: 'Clear signature',
		description: 'The name of the button that erases the signature on the pad.',
	},
})

/**
 * The range of `strokeWidth`. The `@minimum` and `@maximum` tags of the prop
 * give the same numbers to the docs.
 * @internal
 */
const STROKE_WIDTH = { min: 1, max: 6 } as const

/** The name of an empty pad, such as "Signature, empty". */
const emptyMessage = defineMessage<{ name: string }>({
	id: 'ui.signaturePad.empty',
	defaultMessage: '{name}, empty',
	description:
		'The name of a signature pad with no signature on it. The name is the name of the pad, such as "Signature".',
})

export type { SignaturePadHandle }

/**
 * Props for {@link SignaturePad}; controls the bound field value, stroke styling, the stroke bracket, and the optional clear affordance.
 * The root `<div>` takes the rest. The `aria-label` names the canvas, and the
 * `ref` takes the imperative handle, not the element.
 *
 * @see {@link SignaturePadHandle} for the imperative `ref` API.
 */
export type SignaturePadProps = Omit<
	ComponentProps<'div'>,
	'ref' | 'children' | 'defaultValue' | 'placeholder' | 'aria-label'
> & {
	/** Binds the data-URL signature to an enclosing Form field. `Form.defaultValues` must seed `string | null`. */
	name?: string
	/** Controlled value: a data URL, or `null` / `undefined` when empty. */
	value?: string | null
	/** Initial value when uncontrolled. */
	defaultValue?: string | null
	/** Fires when a stroke ends. Receives the signature as a data URL, or `null` when cleared. */
	onValueChange?: (value: string | null) => void
	/**
	 * Fires when a stroke starts, after the pad accepts the press.
	 *
	 * `onValueChange` reports the end of a stroke, and nothing reports the start.
	 * The two together bracket the gesture. Use this callback to mark the field
	 * dirty as the pen lands. It can also hold a save while the user signs. A press
	 * that the pad refuses fires nothing. That covers a disabled or read-only pad,
	 * a non-primary mouse button, a point outside the canvas, and a canvas with no
	 * 2D context. All of them return before the stroke starts.
	 */
	onDrawStart?: () => void
	/**
	 * Disables the pad.
	 * @defaultValue `false`, or the state of the enclosing Control or Field.
	 */
	disabled?: boolean
	/**
	 * Shows the signature and takes no stroke.
	 * @defaultValue `false`, or the state of the enclosing Control.
	 */
	readOnly?: boolean
	/**
	 * Placeholder rendered over an empty pad. A disabled or read-only pad
	 * hides it, because the pad takes no stroke.
	 *
	 * @defaultValue `'Sign here'`, in the language of the reader.
	 */
	placeholder?: string
	/**
	 * Stroke color, as any CSS color the canvas context accepts.
	 *
	 * @defaultValue the pad's own computed `color`, a dark ink on the pad's
	 * white surface in both the light and the dark theme.
	 */
	strokeColor?: string
	/**
	 * Stroke width in CSS pixels, held between 1 and 6. A thicker stroke fills
	 * the small loops of a signature.
	 *
	 * @minimum 1
	 * @maximum 6
	 * @defaultValue 2
	 */
	strokeWidth?: number
	/**
	 * Renders the built-in clear button.
	 *
	 * @defaultValue true
	 */
	clearable?: boolean
	/**
	 * Accessible name for the canvas. While no stroke is present, the name says
	 * that the pad is empty, as in "Signature, empty".
	 *
	 * @defaultValue `'Signature'`, in the language of the reader.
	 */
	'aria-label'?: string
	ref?: Ref<SignaturePadHandle>
}

/**
 * Pointer-driven canvas for capturing a signature; emits a data URL when a stroke ends and stays sized to its container under devicePixelRatio.
 *
 * @remarks
 * Backs the controlled triad and an enclosing `<Form>`/`<Control>` field. A
 * `name` binds the data URL to the form store. The ambient `<Control>` cascade
 * applies as `useControlProps` resolves it. An explicit `disabled` or
 * `readOnly` wins over the Control's. The validation ring and the description
 * ids go onto the canvas (`role="img"`). On clear, focus moves
 * to the canvas as the clear button unmounts (WCAG 2.4.3). The backing store is
 * `string | null`; `undefined` is never emitted.
 *
 * @see {@link SignaturePadProps}
 * @see {@link SignaturePadHandle}
 */
export function SignaturePad({
	name,
	value,
	defaultValue,
	onValueChange,
	onDrawStart,
	disabled,
	readOnly,
	placeholder: placeholderProp,
	strokeColor,
	strokeWidth: rawStrokeWidth = 2,
	clearable = true,
	'aria-label': ariaLabelProp,
	ref,
	className,
	...props
}: SignaturePadProps) {
	const intl = useIntl()

	const placeholder = placeholderProp ?? intl.formatMessage(messages.placeholder)

	const ariaLabel = ariaLabelProp ?? intl.formatMessage(messages.label)

	const strokeWidth = clamp(rawStrokeWidth, STROKE_WIDTH.min, STROKE_WIDTH.max)

	// The state resolves the Control cascade: the canvas takes the field's
	// validity and description/error ids, and an ambient disabled or read-only
	// Control stops drawing unless an explicit prop says otherwise.
	const {
		id,
		containerRef,
		canvasRef,
		empty,
		disabled: resolvedDisabled,
		readOnly: resolvedReadOnly,
		describedBy,
		validation,
		handlePointerDown,
		handlePointerMove,
		commit,
		clear,
	} = useSignaturePadState({
		name,
		value,
		defaultValue,
		onValueChange,
		onDrawStart,
		disabled,
		readOnly,
		strokeColor,
		strokeWidth,
		ref,
	})

	const handleClear = useCallback(() => {
		clear()

		// Moves focus to the canvas once the clear button unmounts (WCAG 2.4.3).
		canvasRef.current?.focus()
	}, [clear, canvasRef])

	return (
		<div
			data-slot="signature-pad"
			{...props}
			ref={containerRef}
			data-empty={dataAttr(empty)}
			data-disabled={dataAttr(resolvedDisabled)}
			data-readonly={dataAttr(resolvedReadOnly)}
			className={cn(k().base, className)}
		>
			<canvas
				id={id}
				ref={canvasRef}
				data-slot="signature-pad-canvas"
				// `role="img"` makes the `aria-label` perceivable; a bare `<canvas>`
				// has no implicit role. Empty state rides the name (`, empty`);
				// disabled/read-only is conveyed via `aria-disabled` below.
				role="img"
				aria-label={empty ? intl.formatMessage(emptyMessage, { name: ariaLabel }) : ariaLabel}
				aria-describedby={describedBy}
				aria-disabled={ariaAttr(resolvedDisabled || resolvedReadOnly)}
				// Programmatically focusable (not in the tab order); receives focus
				// when the clear button unmounts.
				tabIndex={-1}
				// A Form field error (from `name`) or an ambient error severity marks
				// it invalid; otherwise a warning or success severity shows.
				{...validation}
				// A disabled pad refuses input; a read-only pad only shows its value.
				className={cn(
					k().canvas,
					resolvedDisabled ? 'cursor-not-allowed' : resolvedReadOnly && 'cursor-default',
				)}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={commit}
				onPointerCancel={commit}
				onPointerLeave={commit}
			/>
			{empty && !resolvedDisabled && !resolvedReadOnly && (
				<div data-slot="signature-pad-placeholder" className={k().placeholder}>
					{placeholder}
				</div>
			)}
			{clearable && !resolvedDisabled && !resolvedReadOnly && !empty && (
				<div data-slot="signature-pad-actions" className={k().actions}>
					<Button
						type="button"
						size="sm"
						color="amber"
						data-slot="signature-pad-clear"
						aria-label={intl.formatMessage(messages.clear)}
						onPointerDown={(event) => {
							event.stopPropagation()
						}}
						onClick={handleClear}
					>
						{intl.formatMessage(intlMessages.clear)}
					</Button>
				</div>
			)}
		</div>
	)
}
