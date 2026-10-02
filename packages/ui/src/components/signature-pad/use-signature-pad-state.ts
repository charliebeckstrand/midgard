'use client'

import { type Ref, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useControlProps } from '../control/use-control-props'
import { useFormValue } from '../form/use-form-value'
import { drawSnapshot } from './signature-pad-utilities'
import { useSignaturePadCanvasSizing } from './use-signature-pad-canvas-sizing'
import { useSignaturePadDrawing } from './use-signature-pad-drawing'

/**
 * Imperative handle exposed via `ref`. It can clear the pad, or read its current
 * image as a data URL (passing through the canvas `type`/`quality`). It can also
 * test whether any stroke has been drawn.
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
	strokeColor: string | undefined
	strokeWidth: number
	onDrawStart?: () => void
	ref?: Ref<SignaturePadHandle>
}

/**
 * Core state for {@link SignaturePad}: binds the data-URL value to a Form field,
 * and tracks emptiness. It drives the canvas through the sizing and drawing
 * hooks, and exposes the imperative {@link SignaturePadHandle}.
 *
 * @internal
 * @param options - Controlled-triad value, `name` binding, stroke styling, the
 * `disabled`/`readOnly` flags, the `onDrawStart` report, and the forwarded
 * `ref`.
 * @returns The `containerRef`/`canvasRef`, the `empty` flag, the resolved
 * Control cascade (`disabled`, `readOnly`, `describedBy`, `validation`), and the
 * `handlePointerDown`/`handlePointerMove`/`commit`/`clear` handlers.
 * @remarks
 * `commit` (stroke end) and `clear` both mark the bound field touched — the
 * pad's analogue of blur. `commit` marks it only when a stroke ends, not on a
 * pointer release or leave with no stroke. A controlled `current` change that
 * differs from the shown value repaints from the snapshot via an effect.
 * External resets therefore stay in sync without re-emitting. A stroke that a
 * controlled owner does not take is wiped, so the pad shows the owner's value.
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
	onDrawStart,
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

	// The Control cascade: an explicit prop wins over the enclosing Control, and
	// the field error merges with an ambient error severity.
	const control = useControlProps({ disabled, readOnly, invalid })

	const current = currentValue ?? null

	const canvasRef = useRef<HTMLCanvasElement>(null)

	const containerRef = useRef<HTMLDivElement>(null)

	// The value that the pad shows: the last stroke it emitted, or the value it
	// painted. It is state, so a stroke that a controlled owner refuses still
	// runs the sync effect, and the effect wipes the stroke.
	const [shown, setShown] = useState<string | null>(null)

	const [empty, setEmpty] = useState(current == null)

	const { forgetDrawing } = useSignaturePadCanvasSizing({
		containerRef,
		canvasRef,
		empty,
		strokeColor,
		strokeWidth,
	})

	useEffect(() => {
		if (current === shown) return

		const canvas = canvasRef.current

		if (!canvas) return

		const context = canvas.getContext('2d')

		if (!context) return

		context.clearRect(0, 0, canvas.width, canvas.height)

		forgetDrawing()

		if (!current) {
			setEmpty(true)

			setShown(null)

			return
		}

		drawSnapshot(canvas, current, forgetDrawing)

		setEmpty(false)

		setShown(current)
	}, [current, shown, forgetDrawing])

	// A stroke end records its snapshot as shown before it emits. The sync
	// effect then skips a value that the pad drew, and wipes a value that the
	// owner did not take.
	const emit = useCallback(
		(next: string | null) => {
			setShown(next)

			setCurrent(next)
		},
		[setCurrent],
	)

	const {
		handlePointerDown,
		handlePointerMove,
		commit: commitStroke,
	} = useSignaturePadDrawing({
		canvasRef,
		disabled: control.disabled,
		readOnly: control.readOnly,
		strokeColor,
		strokeWidth,
		empty,
		setEmpty,
		setCurrent: emit,
		onDrawStart,
		onInk: forgetDrawing,
	})

	// A stroke ending or a clear is the field's "blur" — the user has acted on
	// the pad, so mark the bound Form field touched (no-op outside a Form). A
	// pointer release or leave with no stroke is not a stroke end.
	const commit = useCallback(() => {
		if (commitStroke()) setTouched()
	}, [commitStroke, setTouched])

	const clear = useCallback(() => {
		const canvas = canvasRef.current

		if (canvas) {
			const context = canvas.getContext('2d')

			context?.clearRect(0, 0, canvas.width, canvas.height)
		}

		forgetDrawing()

		setEmpty(true)

		emit(null)

		setTouched()
	}, [forgetDrawing, emit, setTouched])

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
		disabled: control.disabled === true,
		readOnly: control.readOnly === true,
		describedBy: control['aria-describedby'],
		validation: control.validation,
		handlePointerDown,
		handlePointerMove,
		commit,
		clear,
	}
}
