'use client'

import { type CSSProperties, type Ref, useRef } from 'react'
import { cn, dataAttr } from '../../../core'
import { useDensity } from '../../../primitives/density'
import { k, type RangeSliderVariants } from '../../../recipes/kata/slider-range'
import { pct } from '../../../utilities'
import { useFormValue } from '../../form/use-form-value'
import type { ThumbButtonRefs, ThumbIndex } from './types'
import { useRangeKeyboard } from './use-range-keyboard'
import { useRangePointer } from './use-range-pointer'

/** Props for {@link RangeSlider}: the `[start, end]` controllable triad, `min`/`max`/`step` bounds, `allowCross` overlap policy, the pointer-drag bracket, per-thumb `labels` and `getValueText` for assistive tech, plus `size`/`color` variants. */
export type RangeSliderProps = {
	/** Binds the range to an enclosing Form field. Seed `Form.defaultValues` with a `[number, number]`. */
	name?: string
	value?: [number, number]
	defaultValue?: [number, number]
	onValueChange?: (value: [number, number]) => void
	min?: number
	max?: number
	step?: number
	size?: RangeSliderVariants['size']
	color?: RangeSliderVariants['color']
	disabled?: boolean
	/**
	 * Whether moving a thumb past the other swaps their roles. When `false`,
	 * each thumb is clamped at the other's value. On a keyboard swap, focus
	 * follows the moving value to the other thumb button.
	 *
	 * @defaultValue `true`
	 */
	allowCross?: boolean
	/**
	 * Accessible names for the `[start, end]` thumbs; name what each thumb
	 * bounds (e.g. `['Min price', 'Max price']`).
	 *
	 * @defaultValue `['Range start', 'Range end']`
	 */
	labels?: [string, string]
	/** Formats a thumb's value for assistive tech (`aria-valuetext`): currency, ratings, levels announce as meaningful text instead of a bare number. */
	getValueText?: (value: number, thumb: ThumbIndex) => string
	/**
	 * Fires with the grabbed thumb when a pointer drag starts. Pair it with
	 * {@link RangeSliderProps.onDragEnd} to bracket the drag.
	 *
	 * `onValueChange` reports the values, not the gesture. It also fires once per
	 * move for the whole drag. Use this callback to hold expensive work down while
	 * the drag runs. An arrow-key step has no drag lifecycle, so it fires neither
	 * callback. A press on stacked thumbs grabs no thumb until the first move gives
	 * a direction. The start then arrives with that move, not with the press.
	 */
	onDragStart?: (thumb: ThumbIndex) => void
	/**
	 * Fires with the grabbed thumb when a pointer drag ends. The pointer lift, a
	 * cancel, and a lost capture all end the drag. Exactly one end follows each
	 * start.
	 *
	 * The settled values already went through `onValueChange`. This callback marks
	 * only the end of the drag. Use it to persist the range, or to release what
	 * {@link RangeSliderProps.onDragStart} held. Under `allowCross` a thumb that
	 * passes the other takes its slot. The pair still reports the thumb that the
	 * press grabbed, so a start and an end always match.
	 */
	onDragEnd?: (thumb: ThumbIndex) => void
	className?: string
	style?: CSSProperties
	ref?: Ref<HTMLDivElement>
}

/**
 * Dual-thumb range input over `[start, end]`; controlled or uncontrolled.
 * Builds the track, fill, and two `role="slider"` thumb buttons by hand (no
 * native `<input>`), and wires pointer drag and arrow-key stepping. `size`
 * resolves through the Density cascade. Crossing thumbs swap roles by default
 * under `allowCross`, and keyboard focus follows the moving value. Set it
 * `false` to clamp each thumb at the other. Each thumb carries `aria-valuemin`/`max`/`now` and a
 * `labels` name, with optional `getValueText` for `aria-valuetext`.
 */
export function RangeSlider({
	name,
	value,
	defaultValue,
	onValueChange,
	min = 0,
	max = 100,
	step = 1,
	size,
	color,
	disabled = false,
	allowCross = true,
	labels = ['Range start', 'Range end'],
	getValueText,
	onDragStart,
	onDragEnd,
	className,
	style,
	ref,
}: RangeSliderProps) {
	const { value: range, setValue: setRange } = useFormValue<[number, number]>(name, {
		value,
		defaultValue: defaultValue ?? [min, max],
		onValueChange: onValueChange
			? (v) => {
					if (v != null) onValueChange(v)
				}
			: undefined,
	})

	const current = range ?? [min, max]

	// Resolves size through the Density cascade: explicit prop > ambient Density,
	// falling back to `'md'` outside any provider.
	const { size: inheritedSize } = useDensity()

	const resolvedSize = size ?? inheritedSize

	const trackRef = useRef<HTMLDivElement>(null)
	const loThumbRef = useRef<HTMLButtonElement>(null)
	const hiThumbRef = useRef<HTMLButtonElement>(null)

	// One tuple for both hooks, so the pair cannot drift between them.
	const thumbRefs: ThumbButtonRefs = [loThumbRef, hiThumbRef]

	const overlap = allowCross ? 'swap' : 'clamp'

	const { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture } =
		useRangePointer({
			min,
			max,
			step,
			disabled,
			current,
			trackRef,
			setRange,
			overlap,
			thumbRefs,
			onDragStart,
			onDragEnd,
		})

	const handleKeyDown = useRangeKeyboard({
		min,
		max,
		step,
		current,
		setRange,
		overlap,
		thumbRefs,
	})

	const lo = pct(current[0], min, max)
	const hi = pct(current[1], min, max)

	return (
		<div
			ref={ref}
			data-slot="slider-range"
			data-disabled={dataAttr(disabled)}
			className={cn(k.root({ size: resolvedSize, color }), className)}
			style={style}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			onPointerCancel={onPointerCancel}
			onLostPointerCapture={onLostPointerCapture}
		>
			{/* Track */}
			<div
				ref={trackRef}
				data-slot="slider-range-track"
				className={cn(k.track({ size: resolvedSize }), 'top-1/2 -translate-y-1/2')}
			>
				{/* Filled range */}
				<div
					data-slot="slider-range-fill"
					className={cn(k.fill, 'h-full')}
					style={{ left: `${lo}%`, right: `${100 - hi}%` }}
				/>
			</div>

			{/* Low thumb */}
			<button
				ref={loThumbRef}
				type="button"
				role="slider"
				tabIndex={disabled ? -1 : 0}
				disabled={disabled}
				aria-valuemin={min}
				aria-valuemax={current[1]}
				aria-valuenow={current[0]}
				aria-valuetext={getValueText?.(current[0], 0)}
				aria-label={labels[0]}
				data-slot="slider-range-thumb"
				className={cn(k.thumb({ size: resolvedSize }), 'top-1/2 -translate-y-1/2')}
				style={{ left: `${lo}%` }}
				onKeyDown={handleKeyDown(0)}
			/>

			{/* High thumb */}
			<button
				ref={hiThumbRef}
				type="button"
				role="slider"
				tabIndex={disabled ? -1 : 0}
				disabled={disabled}
				aria-valuemin={current[0]}
				aria-valuemax={max}
				aria-valuenow={current[1]}
				aria-valuetext={getValueText?.(current[1], 1)}
				aria-label={labels[1]}
				data-slot="slider-range-thumb"
				className={cn(k.thumb({ size: resolvedSize }), 'top-1/2 -translate-y-1/2')}
				style={{ left: `${hi}%` }}
				onKeyDown={handleKeyDown(1)}
			/>
		</div>
	)
}
