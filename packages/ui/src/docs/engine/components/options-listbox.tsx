import type { ReactNode } from 'react'
import {
	Listbox,
	ListboxLabel,
	ListboxOption,
	type ListboxProps,
} from '../../../components/listbox'

/** One selectable option: the token `value` and its display `label`. */
type LabeledOption<T extends string> = { value: T; label: string }

type OptionsListboxProps<T extends string> = {
	options: readonly LabeledOption<T>[]
	/** What the picker sets, as its accessible name (`Size`). The trigger shows the value. */
	label: string
	value: T
	/** Content before the value in the trigger, such as a visible name for the picker. */
	prefix?: ReactNode
	placement?: ListboxProps<T>['placement']
	onValueChange: (value: T) => void
}

/**
 * The docs chrome's shared single-select control: a {@link Listbox} over a fixed
 * labeled option set, backing the density, theme, size, and variant pickers.
 *
 * The `undefined`-guard lives here once, so an empty selection never reaches
 * `onValueChange`. Callers therefore pass a plain `(value: T) => void`, without
 * the per-wrapper cast that pretended `undefined` couldn't arrive.
 */
export function OptionsListbox<T extends string>({
	options,
	label,
	value,
	prefix,
	placement = 'bottom-auto',
	onValueChange,
}: OptionsListboxProps<T>) {
	const labelFor = (v: T) => options.find((option) => option.value === v)?.label ?? v

	return (
		<Listbox<T>
			aria-label={label}
			value={value}
			displayValue={labelFor}
			prefix={prefix}
			placement={placement}
			onValueChange={(v) => v && onValueChange(v)}
		>
			{options.map((option) => (
				<ListboxOption key={option.value} value={option.value}>
					<ListboxLabel>{option.label}</ListboxLabel>
				</ListboxOption>
			))}
		</Listbox>
	)
}
