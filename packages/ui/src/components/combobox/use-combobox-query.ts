'use client'

import { useQuery } from '../../primitives/query'

/**
 * Live and deferred query of the enclosing `Combobox`. Filter options against
 * `deferredQuery` to keep typing responsive; `query` tracks every keystroke.
 */
export function useComboboxQuery() {
	return useQuery()
}
