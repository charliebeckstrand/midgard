'use client'

import { useIdScope } from '../../hooks/use-id-scope'
import { useControlTarget } from './use-control-target'

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
