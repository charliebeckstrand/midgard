'use client'

import { type Ref, useCallback } from 'react'
import { cn, invalidAttrs } from '../../core'
import { k } from '../../recipes/kata/signature-pad'
import { Button } from '../button'
import { useControl } from '../control/context'
import { type SignaturePadHandle, useSignaturePadState } from './use-signature-pad-state'

export type { SignaturePadHandle }

export type SignaturePadProps = {
	/** Controlled value: a data URL, or `null` / `undefined` when empty. */
	value?: string | null
	/** Initial value for uncontrolled mode. */
	defaultValue?: string | null
	/** Fires when a stroke ends. Receives the signature as a data URL, or `null` when cleared. */
	onValueChange?: (value: string | null) => void
	disabled?: boolean
	readOnly?: boolean
	/** Placeholder rendered over an empty pad. */
	placeholder?: string
	/** Stroke color. Defaults to `#18181b` (zinc-900). */
	strokeColor?: string
	/** Stroke width in CSS pixels. Defaults to 2. */
	strokeWidth?: number
	/** Render the built-in clear button. @default true */
	clearable?: boolean
	'aria-label'?: string
	ref?: Ref<SignaturePadHandle>
	className?: string
}

/** Pointer-driven canvas for capturing a signature; emits a data URL when a stroke ends and stays sized to its container under devicePixelRatio. */
export function SignaturePad({
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

	const { containerRef, canvasRef, empty, handlePointerDown, handlePointerMove, commit, clear } =
		useSignaturePadState({
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
				{...invalidAttrs(control?.invalid)}
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
