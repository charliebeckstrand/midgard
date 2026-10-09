'use client'

import { type CSSProperties, type FocusEvent, type Ref, useEffect, useRef } from 'react'
import { cn, dataAttr, invalidAttrs } from '../../../core'
import { useIdScope } from '../../../hooks/use-id-scope'
import { k, type RangeSliderVariants } from '../../../recipes/kata/slider-range'
import { pct } from '../../../utilities'
import { useControl } from '../../control/context'
import { useControlProps } from '../../control/use-control-props'
import { useFormValue } from '../../form/use-form-value'
import type { ThumbButtonRefs, ThumbIndex } from './types'
import { useRangeKeyboard } from './use-range-keyboard'
import { useRangePointer } from './use-range-pointer'

/** Props for {@link RangeSlider}: the `[start, end]` controllable triad, `min`/`max`/`step` bounds, `allowCross` overlap policy, the pointer-drag bracket, per-thumb `labels` and `getValueText` for assistive tech, plus `size`/`color` variants. */
export type RangeSliderProps = {
	/** Id of the start thumb. Without the prop, the start thumb takes the id of the enclosing Control, else a generated id. */
	id?: string
	/** Binds the range to an enclosing Form field. Seed `Form.defaultValues` with a `[number, number]`. */
	name?: string
	value?: [number, number]
	defaultValue?: [number, number]
	onValueChange?: (value: [number, number]) => void
	/** @defaultValue 0 */
	min?: number
	/** @defaultValue 100 */
	max?: number
	/** @defaultValue 1 */
	step?: number
	size?: RangeSliderVariants['size']
	/** The color of the filled part of the track. @defaultValue 'blue' */
	color?: RangeSliderVariants['color']
	/** Disables both thumbs. Without the prop, the slider takes the disabled state of the enclosing Control. */
	disabled?: boolean
	/**
	 * Whether moving a thumb past the other swaps their roles. When `false`,
	 * each thumb is clamped at the other's value. On a swap, from a key or a
	 * pointer drag, focus follows the moving value to the other thumb button.
	 *
	 * @defaultValue true
	 */
	allowCross?: boolean
	/**
	 * Accessible names for the `[start, end]` thumbs; name what each thumb
	 * bounds (e.g. `['Min price', 'Max price']`). In a Field with a Label, each
	 * thumb name starts with the Label text, for example "Price Minimum".
	 *
	 * @defaultValue ['Range start', 'Range end']
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
 * native `<input>`), and wires pointer drag and arrow-key stepping. The
 * slider takes the step of the nearest density scope, and an explicit `size`
 * opens a scope on the root. Crossing thumbs swap roles by default
 * under `allowCross`, and keyboard focus follows the moving value. Set it
 * `false` to clamp each thumb at the other. Each thumb carries `aria-valuemin`/`max`/`now` and a
 * `labels` name, with optional `getValueText` for `aria-valuetext`.
 *
 * The track mirrors in a right-to-left layout, as the native input of `Slider` does. The start
 * thumb is then on the right, and a pointer press reads the value from the right edge.
 * `ArrowLeft` steps a thumb up, and `ArrowRight` steps it down.
 *
 * @remarks Bound to a Form field through `name`, the slider marks the field touched when
 * focus leaves the widget. A move from one thumb to the other does not mark it. An error
 * on the field, or an `error` severity on an enclosing Control, marks each thumb invalid.
 * Each thumb also takes the `disabled` state and the `aria-describedby` of the Control.
 *
 * The start thumb takes `id`, else the id of the enclosing Control, so a `<label>` for that id
 * is valid HTML. In a Field with a Label, each thumb takes `aria-labelledby`. It points at the
 * Label, then at a hidden span with the `labels` entry. Without a Field Label, each thumb takes
 * its `labels` entry as `aria-label`.
 *
 * A click on a label for the slider focuses the start thumb and keeps both values. The Field
 * Label is such a label. A disabled slider takes no focus from the click.
 */
export function RangeSlider({
	id,
	name,
	value,
	defaultValue,
	onValueChange,
	min = 0,
	max = 100,
	step = 1,
	size,
	color,
	disabled,
	allowCross = true,
	labels = ['Range start', 'Range end'],
	getValueText,
	onDragStart,
	onDragEnd,
	className,
	style,
	ref,
}: RangeSliderProps) {
	const {
		value: range,
		setValue: setRange,
		setTouched,
		invalid,
	} = useFormValue<[number, number]>(name, {
		value,
		defaultValue: defaultValue ?? [min, max],
		onValueChange: onValueChange
			? (v) => {
					if (v != null) onValueChange(v)
				}
			: undefined,
	})

	const current = range ?? [min, max]

	// The root has no role, so the validation state and the description go on
	// each `role="slider"` thumb.
	const controlProps = useControlProps({ id, disabled, invalid })

	const scope = useIdScope({ id: controlProps.id })

	// A Field Label names each thumb together with the thumb label. The thumb
	// label then needs an element with an id, so it renders as a hidden span.
	const fieldLabelledBy = useControl()?.labelledBy

	const thumbName = (thumb: ThumbIndex) =>
		fieldLabelledBy
			? { 'aria-labelledby': `${fieldLabelledBy} ${scope.sub(`thumb-${thumb}-label`)}` }
			: { 'aria-label': labels[thumb] }

	const resolvedDisabled = controlProps.disabled === true

	const describedBy = controlProps['aria-describedby']

	const validation = invalidAttrs(controlProps.invalid)

	const trackRef = useRef<HTMLDivElement>(null)
	const loThumbRef = useRef<HTMLButtonElement>(null)
	const hiThumbRef = useRef<HTMLButtonElement>(null)

	// The widget has two thumbs and no native input. Focus that moves from one thumb to the
	// other stays in the widget, so only a blur to a node that is not a thumb marks the field.
	const handleThumbBlur = (event: FocusEvent<HTMLButtonElement>) => {
		const next = event.relatedTarget

		if (next !== null && (next === loThumbRef.current || next === hiThumbRef.current)) return

		setTouched()
	}

	// One tuple for both hooks, so the pair cannot drift between them.
	const thumbRefs: ThumbButtonRefs = [loThumbRef, hiThumbRef]

	// The field id is on the start thumb, because a `<button>` is labelable and the `<div>`
	// root is not. A label click sends a click to the button, but some browsers do not focus a
	// button. This listener focuses the start thumb, as a label click focuses the native input
	// of `Slider`. The focus does not change a value.
	useEffect(() => {
		const root = loThumbRef.current?.ownerDocument

		if (!root || resolvedDisabled) return

		const handleClick = (event: MouseEvent) => {
			if (event.defaultPrevented || !(event.target instanceof Element)) return

			const label = event.target.closest('label')

			if (label?.htmlFor === scope.id) loThumbRef.current?.focus()
		}

		root.addEventListener('click', handleClick)

		return () => root.removeEventListener('click', handleClick)
	}, [resolvedDisabled, scope.id])

	const overlap = allowCross ? 'swap' : 'clamp'

	const { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture } =
		useRangePointer({
			min,
			max,
			step,
			disabled: resolvedDisabled,
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

	// Each thumb is bounded by the other: the start thumb runs from `min` to the
	// end value, and the end thumb from the start value to `max`.
	const renderThumb = (thumb: ThumbIndex) => (
		<button
			ref={thumbRefs[thumb]}
			id={thumb === 0 ? scope.id : undefined}
			type="button"
			role="slider"
			tabIndex={resolvedDisabled ? -1 : 0}
			disabled={resolvedDisabled}
			aria-valuemin={thumb === 0 ? min : current[0]}
			aria-valuemax={thumb === 0 ? current[1] : max}
			aria-valuenow={current[thumb]}
			aria-valuetext={getValueText?.(current[thumb], thumb)}
			{...thumbName(thumb)}
			aria-describedby={describedBy}
			{...validation}
			data-slot="slider-range-thumb"
			className={cn(k.thumb(), 'top-1/2 -translate-y-1/2')}
			style={{ insetInlineStart: `${thumb === 0 ? lo : hi}%` }}
			onKeyDown={handleKeyDown(thumb)}
			onBlur={handleThumbBlur}
		/>
	)

	return (
		<div
			ref={ref}
			data-slot="slider-range"
			data-density={size}
			data-disabled={dataAttr(resolvedDisabled)}
			className={cn(k.base({ color }), className)}
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
				className={cn(k.track(), 'top-1/2 -translate-y-1/2')}
			>
				{/* Filled range */}
				<div
					data-slot="slider-range-fill"
					className={cn(k.fill, 'h-full')}
					style={{ insetInlineStart: `${lo}%`, insetInlineEnd: `${100 - hi}%` }}
				/>
			</div>

			{renderThumb(0)}
			{renderThumb(1)}

			{fieldLabelledBy && (
				<>
					<span id={scope.sub('thumb-0-label')} hidden>
						{labels[0]}
					</span>
					<span id={scope.sub('thumb-1-label')} hidden>
						{labels[1]}
					</span>
				</>
			)}
		</div>
	)
}
