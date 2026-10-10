'use client'

import { type Ref, useCallback } from 'react'
import { ariaAttr, cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/signature-pad'
import { Button } from '../button'
import { type SignaturePadHandle, useSignaturePadState } from './use-signature-pad-state'

export type { SignaturePadHandle }

/**
 * Props for {@link SignaturePad}; controls the bound field value, stroke styling, the stroke bracket, and the optional clear affordance.
 *
 * @see {@link SignaturePadHandle} for the imperative `ref` API.
 */
export type SignaturePadProps = {
	/** Binds the data-URL signature to an enclosing Form field. `Form.defaultValues` must seed `string | null`. */
	name?: string
	/** Controlled value: a data URL, or `null` / `undefined` when empty. */
	value?: string | null
	/** Initial value for uncontrolled mode. */
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
	/** @defaultValue `false`, or the state of the enclosing Control or Field. */
	disabled?: boolean
	/** @defaultValue `false`, or the state of the enclosing Control. */
	readOnly?: boolean
	/**
	 * Placeholder rendered over an empty pad. A disabled or read-only pad
	 * hides it, because the pad takes no stroke.
	 *
	 * @defaultValue 'Sign here'
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
	 * Stroke width in CSS pixels.
	 *
	 * @defaultValue 2
	 */
	strokeWidth?: number
	/**
	 * Render the built-in clear button.
	 *
	 * @defaultValue true
	 */
	clearable?: boolean
	/**
	 * Accessible name for the canvas; `, empty` is appended while no stroke is present.
	 *
	 * @defaultValue 'Signature'
	 */
	'aria-label'?: string
	ref?: Ref<SignaturePadHandle>
	className?: string
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
	placeholder = 'Sign here',
	strokeColor,
	strokeWidth = 2,
	clearable = true,
	'aria-label': ariaLabel = 'Signature',
	ref,
	className,
}: SignaturePadProps) {
	// The state resolves the Control cascade: the canvas takes the field's
	// validity and description/error ids, and an ambient disabled or read-only
	// Control stops drawing unless an explicit prop says otherwise.
	const {
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
			ref={containerRef}
			data-slot="signature-pad"
			data-empty={dataAttr(empty)}
			data-disabled={dataAttr(resolvedDisabled)}
			data-readonly={dataAttr(resolvedReadOnly)}
			className={cn(k.base, 'h-40', className)}
		>
			<canvas
				ref={canvasRef}
				data-slot="signature-pad-canvas"
				// `role="img"` makes the `aria-label` perceivable; a bare `<canvas>`
				// has no implicit role. Empty state rides the name (`, empty`);
				// disabled/read-only is conveyed via `aria-disabled` below.
				role="img"
				aria-label={empty ? `${ariaLabel}, empty` : ariaLabel}
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
					k.canvas,
					resolvedDisabled ? 'cursor-not-allowed' : resolvedReadOnly && 'cursor-default',
				)}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={commit}
				onPointerCancel={commit}
				onPointerLeave={commit}
			/>
			{empty && !resolvedDisabled && !resolvedReadOnly && (
				<div data-slot="signature-pad-placeholder" className={cn(k.placeholder)}>
					{placeholder}
				</div>
			)}
			{clearable && !resolvedDisabled && !resolvedReadOnly && !empty && (
				<div data-slot="signature-pad-actions" className={cn(k.actions)}>
					<Button
						type="button"
						size="sm"
						color="amber"
						data-slot="signature-pad-clear"
						aria-label="Clear signature"
						onPointerDown={(event) => {
							event.stopPropagation()
						}}
						onClick={handleClear}
					>
						Clear
					</Button>
				</div>
			)}
		</div>
	)
}
