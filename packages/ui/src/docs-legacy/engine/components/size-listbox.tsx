import type { ListboxProps } from '../../../components/listbox'
import { sizeLabels } from './format'
import { OptionsListbox } from './options-listbox'

type SizeListboxProps<T extends string> = {
	sizes: readonly T[]
	/** The picker's accessible name. Defaults to `Size`. */
	label?: string
	value: T
	placement?: ListboxProps<T>['placement']
	onValueChange: (value: T) => void
}

/** A demo control for picking a component's `size` from a fixed scale, labeled via {@link sizeLabels}. */
export function SizeListbox<T extends string>({
	sizes,
	label = 'Size',
	...rest
}: SizeListboxProps<T>) {
	const options = sizes.map((value) => ({ value, label: sizeLabels[value] ?? value }))

	return <OptionsListbox options={options} label={label} {...rest} />
}
