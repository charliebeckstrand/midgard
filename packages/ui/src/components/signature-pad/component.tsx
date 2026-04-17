'use client'

import { X } from 'lucide-react'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks'
import { Button } from '../button'
import { Icon } from '../icon'
import { useCanvasSizing } from './use-canvas-sizing'
import { useSignatureDrawing } from './use-signature-drawing'
import { drawSnapshot } from './utilities'
import { k } from './variants'

export type SignaturePadHandle = {
	clear: () => void
	toDataURL: (type?: string, quality?: number) => string | null
	isEmpty: () => boolean
}

export type SignaturePadProps = {
	/** Controlled value — a data URL, or `null` / `undefined` when empty. */
	value?: string | null
	/** Initial value for uncontrolled mode. */
	defaultValue?: string | null
	/** Fires when a stroke ends. Receives the signature as a data URL, or `null` when cleared. */
	onChange?: (value: string | null) => void
	disabled?: boolean
	readOnly?: boolean
	/** Placeholder rendered over an empty pad. */
	placeholder?: string
	/** Stroke colour. Defaults to `#18181b` (zinc-900). */
	strokeColor?: string
	/** Stroke width in CSS pixels. Defaults to 2. */
	strokeWidth?: number
	/** Hide the built-in clear button. */
	hideClear?: boolean
	'aria-label'?: string
	className?: string
}

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(function SignaturePad(
	{
		value,
		defaultValue,
		onChange,
		disabled,
		readOnly,
		placeholder = 'Sign here',
		strokeColor = '#18181b',
		strokeWidth = 2,
		hideClear,
		'aria-label': ariaLabel = 'Signature',
		className,
	},
	ref,
) {
	const [current, setCurrent] = useControllable<string | null>({
		value,
		defaultValue: defaultValue ?? null,
		onChange: onChange ? (next) => onChange(next ?? null) : undefined,
	})

	const canvasRef = useRef<HTMLCanvasElement>(null)

	const containerRef = useRef<HTMLDivElement>(null)

	const lastEmittedRef = useRef<string | null>(null)

	const [isEmpty, setIsEmpty] = useState(current == null)

	// ── Canvas sizing (DPR-aware) ──────────────────────
	useCanvasSizing({ containerRef, canvasRef, isEmpty, strokeColor, strokeWidth })

	// ── External value sync ────────────────────────────
	useEffect(() => {
		if (current === lastEmittedRef.current) return

		const canvas = canvasRef.current

		if (!canvas) return

		const ctx = canvas.getContext('2d')

		if (!ctx) return

		ctx.clearRect(0, 0, canvas.width, canvas.height)

		if (!current) {
			setIsEmpty(true)

			lastEmittedRef.current = null

			return
		}

		drawSnapshot(canvas, current)

		setIsEmpty(false)

		lastEmittedRef.current = current
	}, [current])

	// ── Pointer drawing ────────────────────────────────
	const { handlePointerDown, handlePointerMove, commit } = useSignatureDrawing({
		canvasRef,
		disabled,
		readOnly,
		strokeColor,
		strokeWidth,
		isEmpty,
		setIsEmpty,
		lastEmittedRef,
		setCurrent,
	})

	// ── Imperative API ─────────────────────────────────
	const clear = useCallback(() => {
		const canvas = canvasRef.current

		if (canvas) {
			const ctx = canvas.getContext('2d')

			ctx?.clearRect(0, 0, canvas.width, canvas.height)
		}

		setIsEmpty(true)

		lastEmittedRef.current = null

		setCurrent(null)
	}, [setCurrent])

	useImperativeHandle(
		ref,
		() => ({
			clear,
			toDataURL: (type, quality) => canvasRef.current?.toDataURL(type, quality) ?? null,
			isEmpty: () => isEmpty,
		}),
		[clear, isEmpty],
	)

	return (
		<div
			ref={containerRef}
			data-slot="signature-pad"
			data-empty={isEmpty || undefined}
			data-disabled={disabled || undefined}
			data-readonly={readOnly || undefined}
			className={cn(k.base, 'h-40', className)}
		>
			<canvas
				ref={canvasRef}
				data-slot="signature-pad-canvas"
				aria-label={ariaLabel}
				className={cn(k.canvas, (disabled || readOnly) && 'cursor-not-allowed')}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={commit}
				onPointerCancel={commit}
				onPointerLeave={commit}
			/>
			{isEmpty && !disabled && (
				<div data-slot="signature-pad-placeholder" className={cn(k.placeholder)}>
					{placeholder}
				</div>
			)}
			{!hideClear && !disabled && !readOnly && !isEmpty && (
				<div data-slot="signature-pad-actions" className={cn(k.actions)}>
					<Button
						size="sm"
						data-slot="signature-pad-clear"
						aria-label="Clear signature"
						onPointerDown={(event) => {
							// Prevent the canvas pointerdown from firing.
							event.stopPropagation()
						}}
						onClick={clear}
					>
						<Icon icon={<X />} size="xs" />
						Clear
					</Button>
				</div>
			)}
		</div>
	)
})
