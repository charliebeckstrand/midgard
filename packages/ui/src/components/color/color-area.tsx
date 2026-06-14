'use client'

import { type KeyboardEvent, useRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/color-panel'
import { clamp } from '../../utilities'
import { useColorPanelContext } from './context'
import { type DragPosition, useColorDrag } from './use-color-drag'

/**
 * The 2D saturation × brightness field. X maps to saturation, Y (inverted) to
 * value, over a base painted in the current hue. Pointer-draggable and
 * arrow-key operable; `Shift` takes a coarser step.
 */
export function ColorArea() {
	const { hsva, setHsva, disabled, size } = useColorPanelContext()

	const ref = useRef<HTMLDivElement>(null)

	const onPosition = ({ x, y }: DragPosition) =>
		setHsva((prev) => ({ ...prev, s: x * 100, v: (1 - y) * 100 }))

	const drag = useColorDrag(ref, onPosition, disabled)

	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (disabled) return

		const step = event.shiftKey ? 10 : 1

		let { s, v } = hsva

		switch (event.key) {
			case 'ArrowLeft':
				s -= step
				break
			case 'ArrowRight':
				s += step
				break
			case 'ArrowUp':
				v += step
				break
			case 'ArrowDown':
				v -= step
				break
			// APG slider pattern on a 2D area: Home/End pin the x axis
			// (saturation) to its min/max; Page keys take the large step on the
			// y axis (brightness).
			case 'Home':
				s = 0
				break
			case 'End':
				s = 100
				break
			case 'PageUp':
				v += 10
				break
			case 'PageDown':
				v -= 10
				break
			default:
				return
		}

		event.preventDefault()

		setHsva((prev) => ({ ...prev, s: clamp(s, 0, 100), v: clamp(v, 0, 100) }))
	}

	return (
		<div
			ref={ref}
			data-slot="color-area"
			role="slider"
			tabIndex={disabled ? -1 : 0}
			aria-label="Saturation and brightness"
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={Math.round(hsva.s)}
			aria-valuetext={`Saturation ${Math.round(hsva.s)}%, brightness ${Math.round(hsva.v)}%`}
			aria-disabled={disabled || undefined}
			className={cn(k.area.base({ size }), disabled && 'pointer-events-none opacity-50')}
			style={{ backgroundColor: `hsl(${hsva.h} 100% 50%)` }}
			onPointerDown={drag.onPointerDown}
			onPointerMove={drag.onPointerMove}
			onPointerUp={drag.onPointerUp}
			onPointerCancel={drag.onPointerCancel}
			onLostPointerCapture={drag.onLostPointerCapture}
			onKeyDown={onKeyDown}
		>
			<div aria-hidden="true" className={k.area.saturation} />
			<div aria-hidden="true" className={k.area.value} />
			<div
				data-slot="color-area-thumb"
				className={cn(k.handle)}
				style={{ left: `${hsva.s}%`, top: `${100 - hsva.v}%` }}
			/>
		</div>
	)
}
