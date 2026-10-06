'use client'

import { type ChangeEvent, type KeyboardEvent, useRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/color-panel'
import { clamp, pct } from '../../utilities'
import { hsvaToHex } from './color-utilities'
import { useColorPanelContext } from './context'
import { type DragPosition, useColorDrag } from './use-color-drag'

type ColorSliderProps = {
	/** `hue` rides the `0-360` wheel; `alpha` rides the `0-1` transparency track. */
	channel: 'hue' | 'alpha'
}

/**
 * A single-axis track for either hue or alpha, sharing the panel's drag +
 * keyboard model.
 *
 * @remarks
 * A native `<input type="range">` covers the track and holds the focus, the
 * keys, and the slider semantics. The input lets the pointer through, so the
 * track keeps the drag. The input has the same box as the track, so the drag
 * measures the input and focuses it on a press.
 *
 * @internal
 */
export function ColorSlider({ channel }: ColorSliderProps) {
	const { hsva, setHsva, disabled } = useColorPanelContext()

	const ref = useRef<HTMLInputElement>(null)

	const isHue = channel === 'hue'
	const max = isHue ? 360 : 1
	const value = isHue ? hsva.h : hsva.a

	const setValue = (next: number) => {
		const clamped = clamp(next, 0, max)

		setHsva((prev) => (isHue ? { ...prev, h: clamped } : { ...prev, a: clamped }))
	}

	const onPosition = ({ x }: DragPosition) => setValue(x * max)

	const drag = useColorDrag(ref, onPosition, disabled, 'pointer')

	// The native keys step by `step` only, and the Page keys of a range input
	// differ by browser. This handler keeps the Shift step and the Page step.
	const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
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

		setValue(next)
	}

	// An assistive-technology increment changes the value with no key event.
	const onChange = (event: ChangeEvent<HTMLInputElement>) => setValue(Number(event.target.value))

	// Transparent-to-opaque gradient for the alpha track ends on the current
	// color at full opacity.
	const opaque = hsvaToHex({ ...hsva, a: 1 })

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: a press guard for the drag. The range input inside holds the focus, the keys, and the slider semantics.
		<div
			data-slot="color-slider"
			data-channel={channel}
			className={cn(
				k.track.base,
				isHue ? k.hue : k.checkerboard,
				disabled && 'pointer-events-none opacity-50',
			)}
			onMouseDown={drag.onMouseDown}
			onPointerDown={drag.onPointerDown}
			onPointerMove={drag.onPointerMove}
			onPointerUp={drag.onPointerUp}
			onPointerCancel={drag.onPointerCancel}
			onLostPointerCapture={drag.onLostPointerCapture}
		>
			{!isHue && (
				<div
					aria-hidden="true"
					className="absolute inset-0 rounded-full"
					style={{ backgroundImage: `linear-gradient(to right, transparent, ${opaque})` }}
				/>
			)}
			<input
				ref={ref}
				type="range"
				data-slot="color-slider-input"
				min={0}
				max={max}
				step={isHue ? 1 : 0.01}
				value={isHue ? Math.round(value) : Math.round(value * 100) / 100}
				disabled={disabled}
				aria-label={isHue ? 'Hue' : 'Alpha'}
				aria-valuetext={isHue ? `${Math.round(value)}°` : `${Math.round(value * 100)}%`}
				className={k.track.input}
				onKeyDown={onKeyDown}
				onChange={onChange}
			/>
			<div
				data-slot="color-slider-thumb"
				className={cn(k.handle, 'top-1/2')}
				style={{ left: `${pct(value, 0, max)}%` }}
			/>
		</div>
	)
}
