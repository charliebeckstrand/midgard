'use client'

import { useMemo, useState } from 'react'
import type { AriaProps } from '../../types'
import { useAriaIds } from '../use-aria-ids'
import { useIdScope } from '../use-id-scope'

/** Which ARIA relation a registered slot's id contributes to. */
export type A11yRelation = 'labelledby' | 'describedby'

export type A11yScopeOptions<Slot extends string = never> = {
	/** Explicit scope id; falls back to a generated one. */
	id?: string
	/**
	 * Named slots mapped to the relation each feeds once it registers. Pass a
	 * stable reference (a module constant) — an inline literal re-derives the
	 * scope each render.
	 */
	slots?: Record<Slot, A11yRelation>
}

export type A11yScope<Slot extends string = never> = {
	/** Stable scope id. */
	id: string
	/** Derive an arbitrary suffixed id within the scope. */
	sub: (suffix: string) => string
	/** Derived id for each declared slot. */
	ids: Record<Slot, string>
	/** Per-slot mount registrar — call inside an effect; the cleanup deregisters. */
	register: Record<Slot, () => () => void>
	/** Spreadable bag — `aria-labelledby` / `aria-describedby` composed from the slots currently registered. */
	ariaProps: AriaProps
}

/**
 * Universal accessibility scope: a stable id plus slot-driven `aria-labelledby`
 * / `aria-describedby` wiring. Declare named slots and the relation each feeds;
 * the matching part registers on mount and the composed attributes reference
 * only the slots actually in the DOM, never a dangling id. Specialized hooks
 * (`useA11yPanel`, `useA11yControl`) layer their slot vocabulary over this base.
 */
export function useA11yScope<Slot extends string = never>(
	options: A11yScopeOptions<Slot> = {},
): A11yScope<Slot> {
	const { id, slots } = options

	const scope = useIdScope({ id })

	const [present, setPresent] = useState<Record<string, boolean>>({})

	const ids = useMemo(() => {
		const out = {} as Record<Slot, string>

		for (const key of Object.keys(slots ?? {}) as Slot[]) out[key] = scope.sub(key)

		return out
	}, [scope.sub, slots])

	const register = useMemo(() => {
		const out = {} as Record<Slot, () => () => void>

		for (const key of Object.keys(slots ?? {}) as Slot[]) {
			out[key] = () => {
				setPresent((prev) => ({ ...prev, [key]: true }))

				return () => setPresent((prev) => ({ ...prev, [key]: false }))
			}
		}

		return out
	}, [slots])

	const buckets = useMemo(() => {
		const labelledby: string[] = []
		const describedby: string[] = []

		for (const key of Object.keys(slots ?? {}) as Slot[]) {
			if (!present[key]) continue

			;(slots?.[key] === 'labelledby' ? labelledby : describedby).push(ids[key])
		}

		return { labelledby, describedby }
	}, [present, ids, slots])

	// Composed at the top level — `useAriaIds` is a hook, so it can't run inside
	// the bucketing loop above.
	const labelledby = useAriaIds(...buckets.labelledby)
	const describedby = useAriaIds(...buckets.describedby)

	const ariaProps = useMemo(
		() => ({ 'aria-labelledby': labelledby, 'aria-describedby': describedby }),
		[labelledby, describedby],
	)

	return useMemo(
		() => ({ id: scope.id, sub: scope.sub, ids, register, ariaProps }),
		[scope.id, scope.sub, ids, register, ariaProps],
	)
}
