'use client'

import { Minus, Plus } from 'lucide-react'
import { useComposedRefs } from 'motion/react'
import type { ChangeEvent } from 'react'
import { announce, cn, composeEventHandlers } from '../../core'
import { useFormValue } from '../../primitives/form/use-form-value'
import { defineMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/input'
import { clamp } from '../../utilities'
import { Button } from '../button'
import { useControl } from '../control/context'
import { Icon } from '../icon'
import { Input, type InputProps } from '../input'

const messages = defineMessages({
	decrease: {
		id: 'ui.numberInput.decrease',
		defaultMessage: 'Decrease',
		description:
			'The name of the button that makes the value of a number field smaller by one step.',
	},
	increase: {
		id: 'ui.numberInput.increase',
		defaultMessage: 'Increase',
		description:
			'The name of the button that makes the value of a number field larger by one step.',
	},
})

/**
 * Props for {@link NumberInput}: {@link InputProps} with numeric `value`/range fields and a
 * number-valued change callback.
 *
 * @remarks `suffix` is withheld and `prefix` is not, which is the difference between a slot
 * this component owns and one it merely inherits. The steppers *are* the suffix, and a
 * consumer's own would replace them. The prefix slot is untouched here. A numeric field
 * with a unit or a currency mark in front of it is what it is for.
 */
export type NumberInputProps = Omit<
	InputProps,
	'type' | 'value' | 'defaultValue' | 'onChange' | 'suffix' | 'min' | 'max' | 'step'
> & {
	value?: number | null
	defaultValue?: number
	/** Fires when the value changes, with the parsed value, or `null` when the field is cleared. */
	onValueChange?: (value: number | null) => void
	min?: number
	max?: number
	/**
	 * Stepper increment; also sets the rounding precision of the steppers, and of the blur
	 * while `round` holds.
	 * @defaultValue 1
	 */
	step?: number
	/**
	 * Rounds the value to the `step` precision on blur. Set `false` to keep a typed value as
	 * it is: the blur then only clamps, and `step` drives only the steppers.
	 * @defaultValue true
	 */
	round?: boolean
}

/**
 * Numeric Input with stepper buttons. Clamps to `min`/`max` and rounds to `step`
 * precision on blur rather than mid-entry (unless `round` is `false`), and binds
 * to an enclosing Form field by `name`.
 *
 * @remarks Stays controlled whenever a `value` prop is present; binds to the
 * Form field named `name` otherwise. Raw input is stored verbatim while typing
 * and only clamped/rounded on blur, so an out-of-range value can briefly display
 * mid-entry. The stepper buttons are `tabIndex={-1}` and mutate silently, so
 * each step mirrors the new value through the live-region announcer (WCAG 4.1.3).
 * Clamp/round-on-blur and the form's touched tracking compose with (rather than
 * replace) the consumer's `onBlur`. A blur that leaves the value as it is does
 * not fire `onValueChange`. The steppers turn off while the field is disabled
 * or read-only, from its own prop or from an enclosing Control or Field. An
 * uncontrolled number input goes back to `defaultValue` on a native form reset,
 * and `onValueChange` reports it.
 * @see {@link Input}
 * @see {@link CurrencyInput}
 */
export function NumberInput({
	value,
	defaultValue,
	onValueChange,
	min,
	max,
	step = 1,
	round: roundOnBlur = true,
	disabled,
	readOnly,
	size,
	className,
	name,
	ref,
	onBlur,
	...props
}: NumberInputProps) {
	const control = useControl()

	// The steppers follow the field: a disabled or read-only field, set here or
	// on an enclosing Control or Field, takes no step.
	const locked = Boolean((disabled ?? control?.disabled) || (readOnly ?? control?.readOnly))

	const {
		value: current,
		resetRef,
		setValue: setCurrent,
		setTouched,
	} = useFormValue<number>(name, { value, defaultValue, onValueChange })

	const setRef = useComposedRefs(resetRef, ref)

	const precision = stepPrecision(step)

	const intl = useIntl()

	const round = (n: number) => Number(n.toFixed(precision))

	const clampValue = (n: number) =>
		clamp(n, min ?? Number.NEGATIVE_INFINITY, max ?? Number.POSITIVE_INFINITY)

	// Clamp AFTER rounding: `toFixed` rounds half-up, and rounding a clamped
	// value can land past min/max (e.g. max 10.05 at precision 1 → 10.1).
	const change = (delta: number) => {
		// From an empty field both steppers seed to `clamp(0, …)`, so Decrease lands
		// on 0 (or `min`) rather than `-step`. Deliberate and test-pinned.
		const next = current === undefined ? clampValue(round(0)) : clampValue(round(current + delta))

		setCurrent(next)

		// The steppers are tabIndex -1 and mutate silently for AT virtual-cursor
		// users; mirror the new value through the announcer (WCAG 4.1.3).
		announce(intl.formatNumber(next))
	}

	const atMin = min !== undefined && current !== undefined && current <= min
	const atMax = max !== undefined && current !== undefined && current >= max

	const decrease = () => change(-step)
	const increase = () => change(step)

	const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
		const raw = event.target.value

		if (raw === '') {
			setCurrent(undefined)

			return
		}

		const parsed = Number(raw)

		if (Number.isNaN(parsed)) return

		// Stores the raw value while typing; clamps on blur instead.
		setCurrent(parsed)
	}

	// The consumer's onBlur runs first. Clamp, round, and the touched mark run
	// whatever it does (CONVENTIONS.md §3.9).
	const handleBlur = composeEventHandlers(
		onBlur,
		() => {
			setTouched()

			if (current === undefined) return

			// A blur that leaves the value as it is emits nothing.
			const next = clampValue(roundOnBlur ? round(current) : current)

			if (next !== current) setCurrent(next)
		},
		{ checkForDefaultPrevented: false },
	)

	return (
		<Input
			ref={setRef}
			type="number"
			inputMode="decimal"
			data-slot="number-input"
			name={name}
			disabled={disabled}
			readOnly={readOnly}
			size={size}
			value={current ?? ''}
			onChange={handleChange}
			onBlur={handleBlur}
			min={min}
			max={max}
			step={step}
			className={cn(k.number, 'tabular-nums', className)}
			suffix={
				// Keep focus on the input when a stepper is pressed. The buttons are
				// tabIndex -1 and mutate silently, so a focus shift would blur the
				// input and end an enclosing edit (e.g. a Grid editable cell, whose
				// numeric editor commits on blur) before the click's step lands.
				// preventDefault cancels only the focus move; the click still fires.
				// The gap also caps the hit areas (`TouchTarget`), so the two buttons
				// split it and do not overlap, and neither reaches over the input.
				<span className="pointer-events-auto flex items-center gap-0.5 [--touch-target-gap-x:--spacing(0.5)]">
					<Button
						type="button"
						variant="bare"
						tabIndex={-1}
						disabled={locked || atMin}
						aria-label={intl.formatMessage(messages.decrease)}
						onMouseDown={(event) => event.preventDefault()}
						onClick={decrease}
					>
						<Icon icon={<Minus />} />
					</Button>
					<Button
						type="button"
						variant="bare"
						tabIndex={-1}
						disabled={locked || atMax}
						aria-label={intl.formatMessage(messages.increase)}
						onMouseDown={(event) => event.preventDefault()}
						onClick={increase}
					>
						<Icon icon={<Plus />} />
					</Button>
				</span>
			}
			{...props}
		/>
	)
}

/**
 * Decimal places implied by `step`, robust to scientific notation.
 * `(1e-7).toString()` is `'1e-7'`, which a naive `split('.')` reads as
 * precision 0, rounding every entry to an integer.
 *
 * @returns Count of fraction digits to round to; `0` for integer steps.
 * @internal
 */
function stepPrecision(step: number): number {
	const text = step.toString()

	const match = text.match(/^(\d+)?(?:\.(\d+))?[eE]([+-]?\d+)$/)

	if (match) {
		const mantissaDecimals = match[2]?.length ?? 0

		return Math.max(0, mantissaDecimals - Number(match[3]))
	}

	return text.split('.')[1]?.length ?? 0
}
