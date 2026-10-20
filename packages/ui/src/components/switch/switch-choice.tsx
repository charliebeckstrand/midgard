'use client'

import type { ComponentProps, MouseEvent, ReactNode } from 'react'
import { ariaAttr, cn, composeEventHandlers, dataAttr } from '../../core'
import type { ScaleStep } from '../../core/density'
import { useFormValue } from '../../primitives/form/use-form-value'
import { defineMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import type { choiceScale } from '../../recipes/kata/switch'
import { k, type SwitchVariants } from '../../recipes/kata/switch'
import { useControl } from '../control/context'
import { useControlProps } from '../control/use-control-props'
import { useControlScope } from '../control/use-control-scope'

const messages = defineMessages({
	off: {
		id: 'ui.switchChoice.off',
		defaultMessage: 'Off',
		description:
			'The name of the middle position of a three-way switch, where neither of its two options is on.',
	},
})

/** One option of a {@link SwitchChoice}: the `value` it sets, and the `label` beside the track. */
export type SwitchChoiceOption<T extends string = string> = {
	value: T
	/** The text beside the track. It also names the radio of the option. */
	label: ReactNode
}

/** Props for {@link SwitchChoice}: the two `options`, the controllable value triad, the recipe `color`, the `size` step, and `<div>` attributes. */
export type SwitchChoiceProps<T extends string = string> = Pick<SwitchVariants, 'color'> & {
	/** The two options: the first at the inline start of the track, the second at the end. */
	options: readonly [SwitchChoiceOption<T>, SwitchChoiceOption<T>]
	/** Controlled value. `undefined` leaves the switch uncontrolled; `null` keeps it controlled and off (CONVENTIONS §7.3). */
	value?: T | null
	/** Initial value when uncontrolled and not form-bound. Omit it to start off. */
	defaultValue?: T
	/** Fires when the position changes, with the value of the option, or `null` once the switch goes off. */
	onValueChange?: (value: T | null) => void
	/**
	 * Binds the value to the enclosing Form field of this name (CONVENTIONS §7.2).
	 * It is not the native grouping name. The radios group under an id of their
	 * own, so two switches bound to different fields never merge into one group.
	 */
	name?: string
	/**
	 * The density step. Omit it to take the step of the nearest density scope.
	 * A step makes the switch a density scope.
	 */
	size?: ScaleStep<typeof choiceScale>
	/**
	 * Keeps the position. A click, a Space press, or an arrow key does not move
	 * the thumb, and `onValueChange` does not fire. The group sets
	 * `aria-readonly`. When omitted, it takes the value of an enclosing
	 * `<Control>` or `<Field>`.
	 * @defaultValue `false`, or the state of the enclosing Control.
	 */
	readOnly?: boolean
	/**
	 * Disables the switch.
	 * @defaultValue `false`, or the state of the enclosing Control or Field.
	 */
	disabled?: boolean
	/**
	 * The accessible name of the middle position.
	 * @defaultValue `'Off'`, in the language of the reader.
	 */
	offLabel?: string
} & Omit<ComponentProps<'div'>, 'defaultValue' | 'onChange' | 'children'>

/** The position of the thumb: the first option, off, or the second option. @internal */
type Position = 'start' | 'center' | 'end'

/**
 * A three-way switch: an off position in the middle, and an option at each
 * side of the track. Use it where a {@link Switch} turns one thing on, and the
 * thing has two kinds, such as a freight mode of LTL or TL.
 *
 * It is a `role="radiogroup"` over three native radios in the order of the
 * track: the first option, off, and the second option. The arrow keys, the
 * focus, and the announced position therefore come from the platform, as on
 * {@link Rating}. The arrow keys move the thumb one position at a time. A click
 * on an option label or on a third of the track sets that position. A click on
 * the option that is on turns the switch off, and an arrow key reaches off from
 * either option.
 *
 * Binds to an enclosing Form field by `name`. An uncontrolled switch goes back
 * to `defaultValue` on a native form reset, and `onValueChange` reports it.
 * Resolves `id` / `disabled` / `readOnly` / `invalid` from an enclosing
 * `<Control>` or `<Field>`. A `<Label as="span">` in the Field names the group
 * through `aria-labelledby`. The track takes the step of the nearest density
 * scope.
 */
export function SwitchChoice<T extends string = string>({
	options,
	value,
	defaultValue,
	onValueChange,
	name,
	size,
	color,
	readOnly,
	disabled,
	offLabel,
	id,
	className,
	onBlur,
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledBy,
	'aria-describedby': ariaDescribedBy,
	...props
}: SwitchChoiceProps<T>) {
	const intl = useIntl()

	const {
		value: current,
		resetRef,
		setValue,
		setTouched,
		invalid,
	} = useFormValue<T>(name, { value, defaultValue, onValueChange })

	const control = useControl()

	const {
		id: resolvedId,
		disabled: resolvedDisabled,
		readOnly: resolvedReadOnly,
		'aria-describedby': describedBy,
		validation,
	} = useControlProps({
		id,
		disabled,
		readOnly,
		invalid,
		'aria-describedby': ariaDescribedBy,
	})

	// The id of the group, and the native grouping name of its radios. It is the
	// switch's own, and never the bound field's, as on Rating.
	const scope = useControlScope(name, resolvedId)

	const [start, end] = options

	const selected = current ?? null

	const position: Position =
		selected === start.value ? 'start' : selected === end.value ? 'end' : 'center'

	const live = !resolvedReadOnly && !resolvedDisabled

	function commit(next: T | null) {
		if (!live) return

		setValue(next)

		setTouched()
	}

	// A click on the option that is on turns the switch off. The click is
	// canceled, so the radio keeps its state and fires no change that sets the
	// same option again.
	function handleClick(event: MouseEvent<HTMLInputElement>, option: T | null) {
		if (option === null || option !== selected) return

		event.preventDefault()

		commit(null)
	}

	/** The `<label>` over the native radio of one position: one third of the track. */
	function zone(at: Position, option: T | null, label?: string) {
		return (
			<label key={at} data-slot="switch-choice-zone" className={cn(k.choice.zone)}>
				<input
					// The off radio carries the reset, because it renders in each state.
					ref={option === null ? resetRef : undefined}
					type="radio"
					data-slot="switch-choice-input"
					id={scope.sub(at)}
					name={scope.id}
					value={option ?? ''}
					checked={selected === option}
					disabled={resolvedDisabled}
					aria-label={label}
					{...validation}
					className={k.input()}
					onChange={() => commit(option)}
					onClick={(event) => handleClick(event, option)}
				/>
			</label>
		)
	}

	/** The text of one option beside the track. It names the radio of the option. */
	function caption(at: Position, option: SwitchChoiceOption<T>) {
		return (
			<label
				htmlFor={scope.sub(at)}
				data-slot="switch-choice-label"
				data-checked={dataAttr(position === at)}
				data-disabled={dataAttr(resolvedDisabled)}
				className={cn(k.choice.label)}
			>
				{option.label}
			</label>
		)
	}

	// The touched mark keeps the state of the field true, so a consumer `onBlur`
	// does not switch it off (CONVENTIONS §3.9).
	const handleBlur = composeEventHandlers(onBlur, () => setTouched(), {
		checkForDefaultPrevented: false,
	})

	// A Label registered on the enclosing Field names the group; an explicit
	// `aria-labelledby` wins over it, as on Rating.
	const labelledBy = ariaLabelledBy ?? control?.labelledBy

	// A `<fieldset>` would impose form-field semantics and a min-content box on
	// this inline row, so the grouping is a named `role="radiogroup"`, as on
	// RadioGroup and Rating.
	return (
		<div
			// Consumer props spread first; the radiogroup role, the naming, and the
			// read-only state after them take precedence.
			{...props}
			id={scope.id}
			data-slot="switch-choice"
			data-density={size}
			data-disabled={dataAttr(resolvedDisabled)}
			role="radiogroup"
			aria-label={labelledBy ? undefined : ariaLabel}
			aria-labelledby={labelledBy}
			aria-describedby={describedBy}
			aria-readonly={ariaAttr(resolvedReadOnly)}
			className={cn(k.choice({ color }), className)}
			onBlur={handleBlur}
		>
			{caption('start', start)}

			<span
				data-slot="switch-choice-track"
				data-position={position}
				data-static={dataAttr(!live)}
				className={cn(k.choice.track)}
			>
				{zone('start', start.value)}
				{zone('center', null, offLabel ?? intl.formatMessage(messages.off))}
				{zone('end', end.value)}

				<span data-slot="switch-choice-thumb" aria-hidden="true" className={cn(k.choice.thumb)} />
			</span>

			{caption('end', end)}
		</div>
	)
}
