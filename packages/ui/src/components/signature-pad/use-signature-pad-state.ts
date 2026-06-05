'use client'

import { type Ref, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useControllable } from '../../hooks'
import { drawSnapshot } from './signature-pad-utilities'
import { useSignaturePadCanvasSizing } from './use-signature-pad-canvas-sizing'
import { useSignaturePadDrawing } from './use-signature-pad-drawing'

export type SignaturePadHandle = {
	clear: () => void
	toDataURL: (type?: string, quality?: number) => string | null
	isEmpty: () => boolean
}

export type SignaturePadStateOptions = {
	value?: string | null
	defaultValue?: string | null
	onValueChange?: (value: string | null) => void
	disabled?: boolean
	readOnly?: boolean
	strokeColor: string
	strokeWidth: number
	ref?: Ref<SignaturePadHandle>
}

export function useSignaturePadState({
	value,
	defaultValue,
	onValueChange,
	disabled,
	readOnly,
	strokeColor,
	strokeWidth,
	ref,
}: SignaturePadStateOptions) {
	const [current, setCurrent] = useControllable<string | null>({
		value,
		defaultValue: defaultValue ?? null,
		onValueChange: onValueChange ? (next) => onValueChange(next ?? null) : undefined,
	})

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

	const { handlePointerDown, handlePointerMove, commit } = useSignaturePadDrawing({
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

	const clear = useCallback(() => {
		const canvas = canvasRef.current

		if (canvas) {
			const context = canvas.getContext('2d')

			context?.clearRect(0, 0, canvas.width, canvas.height)
		}

		setEmpty(true)

		lastEmittedRef.current = null

		setCurrent(null)
	}, [setCurrent])

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
		handlePointerDown,
		handlePointerMove,
		commit,
		clear,
	}
}
