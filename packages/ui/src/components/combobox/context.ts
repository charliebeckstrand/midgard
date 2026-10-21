'use client'

import { createContext } from '../../core'
import type { OptionSelectionContext } from '../../primitives/option'

/**
 * Selection state shared from the {@link Combobox} root to its options. It
 * carries the frozen `value`, the `multiple` flag, the `onSelect` callback, and
 * the `capitalize` flag for string option labels. The hook throws outside a
 * provider, with a message that names the host.
 *
 * @remarks
 * The live and the deferred query are in the shared query context
 * (`useComboboxQuery`), not in this one. The options read only the selection,
 * so they do not render again for each keystroke.
 *
 * @internal
 */
export const [ComboboxContext, useComboboxContext] = createContext<OptionSelectionContext>(
	'Combobox',
	{ error: 'ComboboxOption must be used within <Combobox>' },
)
