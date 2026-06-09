'use client'

import { type KeyboardEvent, useRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/color-panel'
import { clamp, pct } from '../../utilities'
import { hsvaToHex } from './color-utilities'
import { useColorPanelContext } from './context'
import { type DragPosition, useColorDrag } from './use-color-drag'

type ColorSliderProps = {
	/** `hue` rides the `0–360` wheel; `alpha` rides the `0–1` transparency track. */
	channel: 'hue' | 'alpha'
}

/** A single-axis track for either hue or alpha, sharing the panel's drag + keyboard model. */
export function ColorSlider({ channel }: ColorSliderProps) {
	const { hsva, setHsva, disabled, size } = useColorPanelContext()

	const ref = useRef<HTMLDivElement>(null)

	const isHue = channel === 'hue'
	const max = isHue ? 360 : 1
	const value = isHue ? hsva.h : hsva.a

	const onPosition = ({ x }: DragPosition) =>
		setHsva((prev) => (isHue ? { ...prev, h: x * 360 } : { ...prev, a: x }))

	const drag = useColorDrag(ref, onPosition, disabled)

	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (disabled) return

		const step = isHue ? (event.shiftKey ? 10 : 1) : event.shiftKey ? 0.1 : 0.01

		// APG slider pattern: Page keys take the large step regardless of Shift.
		const pageStep = isHue ? 10 : 0.1

		let next = value

		switch (event.key) {
			case 'ArrowLeft':
			case 'ArrowDown':
				next = value - step
				break
			case 'ArrowRight':
			case 'ArrowUp':
				next = value + step
				break
			case 'PageDown':
				next = value - pageStep
				break
			case 'PageUp':
				next = value + pageStep
				break
			case 'Home':
				next = 0
				break
			case 'End':
				next = max
				break
			default:
				return
		}

		event.preventDefault()

		const clamped = clamp(next, 0, max)

		setHsva((prev) => (isHue ? { ...prev, h: clamped } : { ...prev, a: clamped }))
	}

	// Transparent-to-opaque gradient for the alpha track ends on the current
	// colour at full opacity.
	const opaque = hsvaToHex({ ...hsva, a: 1 })

	return (
		<div
			ref={ref}
			data-slot="color-slider"
			data-channel={channel}
			role="slider"
			tabIndex={disabled ? -1 : 0}
			aria-label={isHue ? 'Hue' : 'Alpha'}
			aria-valuemin={0}
			aria-valuemax={max}
			aria-valuenow={isHue ? Math.round(value) : Math.round(value * 100) / 100}
			aria-valuetext={isHue ? `${Math.round(value)}°` : `${Math.round(value * 100)}%`}
			aria-disabled={disabled || undefined}
			className={cn(
				k.track({ size }),
				isHue ? k.hue : k.checkerboard,
				disabled && 'pointer-events-none opacity-50',
			)}
			onPointerDown={drag.onPointerDown}
			onPointerMove={drag.onPointerMove}
			onPointerUp={drag.onPointerUp}
			onPointerCancel={drag.onPointerCancel}
			onLostPointerCapture={drag.onLostPointerCapture}
			onKeyDown={onKeyDown}
		>
			{!isHue && (
				<div
					aria-hidden="true"
					className="absolute inset-0 rounded-full"
					style={{ backgroundImage: `linear-gradient(to right, transparent, ${opaque})` }}
				/>
			)}
			<div
				data-slot="color-slider-thumb"
				className={cn(k.handle, 'top-1/2')}
				style={{ left: `${pct(value, 0, max)}%` }}
			/>
		</div>
	)
}
