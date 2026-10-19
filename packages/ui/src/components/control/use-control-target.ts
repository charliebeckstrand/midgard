'use client'

import { useLayoutEffect } from 'react'
import { useIdScope } from '../../hooks/use-id-scope'
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

/**
 * The id scope of a control that renders its own id, registered under the name
 * of its field.
 *
 * The scope id is `id`, the id that `useControlProps` resolves, or a generated
 * id when no Field, Control, or prop gives one. The hook registers the id that
 * the control renders, so a bare control also links from a `FormErrorSummary`.
 * A control that calls it omits `name` from `useControlProps`, so the id
 * registers one time.
 *
 * @param name - The field name. Pass `undefined` to register nothing.
 * @param id - The id that `useControlProps` resolves.
 * @returns The scope of {@link useIdScope}: the rendered `id`, and `sub` for the
 * ids of the parts.
 * @internal
 */
export function useControlScope(name: string | undefined, id: string | undefined) {
	const scope = useIdScope({ id })

	useControlTarget(name, scope.id)

	return scope
}
