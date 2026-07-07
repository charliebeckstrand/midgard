'use client'

import { Listbox, ListboxLabel, ListboxOption } from '../../../components/listbox'

/** One selectable option: the token `value` and its display `label`. */
export type LabeledOption<T extends string> = { value: T; label: string }

type OptionsListboxProps<T extends string> = {
	options: readonly LabeledOption<T>[]
	value: T
	placement?: 'bottom-start' | 'bottom-end'
	onValueChange: (value: T) => void
	className?: string
	optionClassName?: string
}

/**
 * The docs chrome's shared single-select control: a {@link Listbox} over a fixed
 * labelled option set, backing the density / theme / size / variant pickers. The
 * `undefined`-guard lives here once — an empty selection never reaches
 * `onValueChange` — so callers pass a plain `(value: T) => void` without the
 * per-wrapper cast that pretended `undefined` couldn't arrive.
 */
export function OptionsListbox<T extends string>({
	options,
	value,
	placement = 'bottom-end',
	onValueChange,
	className,
	optionClassName,
}: OptionsListboxProps<T>) {
	const labelFor = (v: T) => options.find((option) => option.value === v)?.label ?? v

	return (
		<Listbox<T>
			value={value}
			displayValue={labelFor}
			placement={placement}
			onValueChange={(v) => v && onValueChange(v)}
			className={className}
		>
			{options.map((option) => (
				<ListboxOption key={option.value} value={option.value}>
					<ListboxLabel className={optionClassName}>{option.label}</ListboxLabel>
				</ListboxOption>
			))}
		</Listbox>
	)
}
