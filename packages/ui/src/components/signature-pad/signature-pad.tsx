'use client'

import { type Ref, useCallback } from 'react'
import { cn, invalidAttrs } from '../../core'
import { k } from '../../recipes/kata/signature-pad'
import { Button } from '../button'
import { useControl } from '../control/context'
import { type SignaturePadHandle, useSignaturePadState } from './use-signature-pad-state'

export type { SignaturePadHandle }

/**
 * Props for {@link SignaturePad}; controls the bound field value, stroke styling, and the optional clear affordance.
 *
 * @see {@link SignaturePadHandle} for the imperative `ref` API.
 */
export type SignaturePadProps = {
	/** Binds the data-URL signature to an enclosing Form field. `Form.defaultValues` should seed `string | null`. */
	name?: string
	/** Controlled value: a data URL, or `null` / `undefined` when empty. */
	value?: string | null
	/** Initial value for uncontrolled mode. */
	defaultValue?: string | null
	/** Fires when a stroke ends. Receives the signature as a data URL, or `null` when cleared. */
	onValueChange?: (value: string | null) => void
	disabled?: boolean
	readOnly?: boolean
	/**
	 * Placeholder rendered over an empty pad.
	 *
	 * @defaultValue `'Sign here'`
	 */
	placeholder?: string
	/**
	 * Stroke colour.
	 *
	 * @defaultValue `'#18181b'` (zinc-900)
	 */
	strokeColor?: string
	/**
	 * Stroke width in CSS pixels.
	 *
	 * @defaultValue `2`
	 */
	strokeWidth?: number
	/**
	 * Render the built-in clear button.
	 *
	 * @defaultValue `true`
	 */
	clearable?: boolean
	/**
	 * Accessible name for the canvas; `, empty` is appended while no stroke is present.
	 *
	 * @defaultValue `'Signature'`
	 */
	'aria-label'?: string
	ref?: Ref<SignaturePadHandle>
	className?: string
}

/**
 * Pointer-driven canvas for capturing a signature; emits a data URL when a stroke ends and stays sized to its container under devicePixelRatio.
 *
 * @remarks
 * Backs the controlled triad and an enclosing `<Form>`/`<Control>` field: a
 * `name` binds the data URL to the form store, while ambient `<Control>` invalid
 * and description ids ride onto the canvas (`role="img"`). On clear, focus moves
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
	disabled,
	readOnly,
	placeholder = 'Sign here',
	strokeColor = '#18181b',
	strokeWidth = 2,
	clearable = true,
	'aria-label': ariaLabel = 'Signature',
	ref,
	className,
}: SignaturePadProps) {
	// Mirrors Control/Field invalid + error-message wiring onto the canvas; its
	// rendered-image value carries the field's validity and shares the control
	// cascade's description/error ids.
	const control = useControl()

	const {
		containerRef,
		canvasRef,
		empty,
		invalid,
		handlePointerDown,
		handlePointerMove,
		commit,
		clear,
	} = useSignaturePadState({
		name,
		value,
		defaultValue,
		onValueChange,
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
			data-empty={empty || undefined}
			data-disabled={disabled || undefined}
			data-readonly={readOnly || undefined}
			className={cn(k.base, 'h-40', className)}
		>
			<canvas
				ref={canvasRef}
				data-slot="signature-pad-canvas"
				// `role="img"` makes the `aria-label` perceivable; a bare `<canvas>`
				// has no implicit role. State (empty/disabled) rides the name.
				role="img"
				aria-label={empty ? `${ariaLabel}, empty` : ariaLabel}
				aria-describedby={control?.describedBy}
				aria-disabled={disabled || readOnly || undefined}
				// Programmatically focusable (not in the tab order); receives focus
				// when the clear button unmounts.
				tabIndex={-1}
				// A Form field error (from `name`) forces invalid; an ambient
				// `<Field invalid>` via Control still applies too.
				{...invalidAttrs(control?.invalid || invalid)}
				className={cn(k.canvas, (disabled || readOnly) && 'cursor-not-allowed')}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={commit}
				onPointerCancel={commit}
				onPointerLeave={commit}
			/>
			{empty && !disabled && (
				<div data-slot="signature-pad-placeholder" className={cn(k.placeholder)}>
					{placeholder}
				</div>
			)}
			{clearable && !disabled && !readOnly && !empty && (
				<div data-slot="signature-pad-actions" className={cn(k.actions)}>
					<Button
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
