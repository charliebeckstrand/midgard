'use client'

import { createContext } from '../../core'
import type { OptionSelectionContext } from '../../primitives/option'

/**
 * Selection state shared from the {@link Listbox} root to its options. The
 * hook throws outside a provider, with a message that names the host.
 *
 * @internal
 */
export const [ListboxContext, useListboxContext] = createContext<OptionSelectionContext>(
	'Listbox',
	{
		error: 'ListboxOption must be used within <Listbox> or <Select>',
	},
)
