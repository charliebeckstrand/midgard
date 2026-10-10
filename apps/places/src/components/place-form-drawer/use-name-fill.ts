'use client'

import { useRef } from 'react'
import type { AddressSuggestion } from 'ui/address-input'
import { useFormActions } from 'ui/form'

/**
 * Writes the name of a picked match into the `name` field of the form.
 *
 * The name the reader searched for is the name they mean, so a pick writes it,
 * but it leaves a name the reader typed. It replaces a name that an earlier
 * pick wrote, so picking the wrong match and then the right one ends with the
 * right name. A match with no name, such as a plain address, leaves the name
 * alone.
 */
export function useNameFill(): (match: AddressSuggestion | null) => void {
	const actions = useFormActions()

	// The last name this hook wrote. It is what parts a name the reader typed —
	// which a second pick must leave alone — from one an earlier pick wrote, which
	// a second pick must replace. It cannot be derived from the selection: a clear
	// drops the match and leaves the name behind.
	const filled = useRef<string | null>(null)

	return (match) => {
		if (match?.name === undefined) return

		const named = String(actions?.getValue('name') ?? '').trim()

		if (named !== '' && named !== filled.current) return

		filled.current = match.name

		actions?.setValue('name', match.name)
	}
}
