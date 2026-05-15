'use client'

import { Check } from 'lucide-react'
import { useResolvedSize } from '../../primitives/concentric'
import { Icon } from '../icon'

/**
 * Selected-state check icon used inside Listbox/Combobox options. Reads the
 * ambient concentric size so the icon scales with the option row's density.
 *
 * Lives in `components/` because primitives can't import `<Icon>` —
 * `createSelectOption`'s factory accepts this as a `CheckIcon` config and
 * renders it inline. The CSS keeps it hidden until the parent row carries
 * `data-selected`.
 */
export function OptionCheckIcon() {
	const size = useResolvedSize()

	return (
		<Icon
			icon={<Check />}
			size={size}
			className="relative hidden self-center text-green-600 group-data-selected/option:inline"
		/>
	)
}
