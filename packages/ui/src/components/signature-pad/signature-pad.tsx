'use client'

import { type Ref, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks'
import { k } from '../../recipes/kata/signature-pad'
import { Button } from '../button'
import { drawSnapshot } from './signature-pad-utilities'
import { useSignaturePadCanvasSizing } from './use-signature-pad-canvas-sizing'
import { useSignaturePadDrawing } from './use-signature-pad-drawing'

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
	onValueChange?: (value: string | null) => void
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
	ref?: Ref<SignaturePadHandle>
	className?: string
}

/** Pointer-driven canvas for capturing a signature — emits a data URL when a stroke ends and stays sized to its container under devicePixelRatio. */
export function SignaturePad({
	value,
	defaultValue,
	onValueChange,
	disabled,
	readOnly,
	placeholder = 'Sign here',
	strokeColor = '#18181b',
	strokeWidth = 2,
	hideClear,
	'aria-label': ariaLabel = 'Signature',
	ref,
	className,
}: SignaturePadProps) {
	const [current, setCurrent] = useControllable<string | null>({
		value,
		defaultValue: defaultValue ?? null,
		onChange: onValueChange ? (next) => onValueChange(next ?? null) : undefined,
	})

	const canvasRef = useRef<HTMLCanvasElement>(null)

	const containerRef = useRef<HTMLDivElement>(null)

	const lastEmittedRef = useRef<string | null>(null)

	const [isEmpty, setIsEmpty] = useState(current == null)

	useSignaturePadCanvasSizing({ containerRef, canvasRef, isEmpty, strokeColor, strokeWidth })

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

	const { handlePointerDown, handlePointerMove, commit } = useSignaturePadDrawing({
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
						color="amber"
						data-slot="signature-pad-clear"
						aria-label="Clear signature"
						onPointerDown={(event) => {
							// Prevent the canvas pointerdown from firing.
							event.stopPropagation()
						}}
						onClick={clear}
					>
						Clear
					</Button>
				</div>
			)}
		</div>
	)
}
