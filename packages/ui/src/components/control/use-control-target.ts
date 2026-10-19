'use client'

import { useLayoutEffect } from 'react'
import { useControlTargets } from './context'

/**
 * Registers the id of a control under the name of its field, with the nearest
 * registry of control ids, such as a form. A `FormErrorSummary` then links the
 * field to the control.
 *
 * @param name - The field name. Pass `undefined` to register nothing.
 * @param id - The id of the control. Pass `undefined` to register nothing.
 * @remarks The registration ends when the caller unmounts or an argument
 * changes. Outside a registry, the hook does nothing.
 * @internal
 */
export function useControlTarget(name: string | undefined, id: string | undefined): void {
	const targets = useControlTargets()

	useLayoutEffect(() => {
		if (!targets || !name || !id) return

		return targets.register(name, id)
	}, [targets, name, id])
}
