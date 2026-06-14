'use client'

import { type Ref, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useFormValue } from '../form/use-form-value'
import { drawSnapshot } from './signature-pad-utilities'
import { useSignaturePadCanvasSizing } from './use-signature-pad-canvas-sizing'
import { useSignaturePadDrawing } from './use-signature-pad-drawing'

/**
 * Imperative handle exposed via `ref`: clear the pad, read its current image
 * as a data URL (passing through the canvas `type`/`quality`), or test whether
 * any stroke has been drawn.
 *
 * @see {@link SignaturePadProps}
 */
export type SignaturePadHandle = {
	/** Erase the pad, reset to empty, and emit `null`. */
	clear: () => void
	/** Current image as a data URL, or `null` before the canvas mounts. Forwards `type`/`quality` to the canvas. */
	toDataURL: (type?: string, quality?: number) => string | null
	/** Whether no stroke has been drawn. */
	isEmpty: () => boolean
}

export type SignaturePadStateOptions = {
	name?: string
	value?: string | null
	defaultValue?: string | null
	onValueChange?: (value: string | null) => void
	disabled?: boolean
	readOnly?: boolean
	strokeColor: string
	strokeWidth: number
	ref?: Ref<SignaturePadHandle>
}

/**
 * Core state for {@link SignaturePad}: binds the data-URL value to a Form field,
 * tracks emptiness, drives the canvas through the sizing and drawing hooks, and
 * exposes the imperative {@link SignaturePadHandle}.
 *
 * @internal
 * @param options - Controlled-triad value, `name` binding, stroke styling, the
 * `disabled`/`readOnly` flags, and the forwarded `ref`.
 * @returns The `containerRef`/`canvasRef`, the `empty` and `invalid` flags, and
 * the `handlePointerDown`/`handlePointerMove`/`commit`/`clear` handlers.
 * @remarks
 * `commit` (stroke end) and `clear` both mark the bound field touched — the
 * pad's analogue of blur. A controlled `current` change that differs from the
 * last emitted value repaints from the snapshot via an effect, so external
 * resets stay in sync without re-emitting.
 */
export function useSignaturePadState({
	name,
	value,
	defaultValue,
	onValueChange,
	disabled,
	readOnly,
	strokeColor,
	strokeWidth,
	ref,
}: SignaturePadStateOptions) {
	// Binds the data-URL value to an enclosing Form field by `name`. Keeps the
	// `string | null` shape (§7.3): the cascade coerces a missing store value to
	// `null`, and onValueChange never emits `undefined`.
	const {
		value: currentValue,
		setValue: setCurrent,
		setTouched,
		invalid,
	} = useFormValue<string | null>(name, {
		value,
		defaultValue: defaultValue ?? null,
		onValueChange: onValueChange ? (next) => onValueChange(next ?? null) : undefined,
	})

	const current = currentValue ?? null

	const canvasRef = useRef<HTMLCanvasElement>(null)

	const containerRef = useRef<HTMLDivElement>(null)

	const lastEmittedRef = useRef<string | null>(null)

	const [empty, setEmpty] = useState(current == null)

	useSignaturePadCanvasSizing({ containerRef, canvasRef, empty, strokeColor, strokeWidth })

	useEffect(() => {
		if (current === lastEmittedRef.current) return

		const canvas = canvasRef.current

		if (!canvas) return

		const context = canvas.getContext('2d')

		if (!context) return

		context.clearRect(0, 0, canvas.width, canvas.height)

		if (!current) {
			setEmpty(true)

			lastEmittedRef.current = null

			return
		}

		drawSnapshot(canvas, current)

		setEmpty(false)

		lastEmittedRef.current = current
	}, [current])

	const {
		handlePointerDown,
		handlePointerMove,
		commit: commitStroke,
	} = useSignaturePadDrawing({
		canvasRef,
		disabled,
		readOnly,
		strokeColor,
		strokeWidth,
		empty,
		setEmpty,
		lastEmittedRef,
		setCurrent,
	})

	// A stroke ending or a clear is the field's "blur" — the user has acted on
	// the pad, so mark the bound Form field touched (no-op outside a Form).
	const commit = useCallback(() => {
		commitStroke()

		setTouched()
	}, [commitStroke, setTouched])

	const clear = useCallback(() => {
		const canvas = canvasRef.current

		if (canvas) {
			const context = canvas.getContext('2d')

			context?.clearRect(0, 0, canvas.width, canvas.height)
		}

		setEmpty(true)

		lastEmittedRef.current = null

		setCurrent(null)

		setTouched()
	}, [setCurrent, setTouched])

	useImperativeHandle(
		ref,
		() => ({
			clear,
			toDataURL: (type, quality) => canvasRef.current?.toDataURL(type, quality) ?? null,
			isEmpty: () => empty,
		}),
		[clear, empty],
	)

	return {
		containerRef,
		canvasRef,
		empty,
		invalid,
		handlePointerDown,
		handlePointerMove,
		commit,
		clear,
	}
}
