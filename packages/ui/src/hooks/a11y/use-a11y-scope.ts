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
	 * stable reference (a module constant); an inline literal re-derives the
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
	/**
	 * Per-slot mount registrar: call inside an effect; the cleanup deregisters.
	 * Pass the id the slot renders (a consumer `id` overriding the derived one);
	 * the composed `aria-*` then references the rendered element, never a
	 * dangling generated id. Omit to register the derived id. Reference-counted:
	 * the id stays until every instance of the slot unmounts.
	 */
	register: Record<Slot, (renderedId?: string) => () => void>
	/** Spreadable bag: `aria-labelledby` / `aria-describedby` composed from the slots currently registered. */
	ariaProps: AriaProps
	/** Per-slot presence: `true` while at least one instance of the slot is mounted. */
	registered: Record<Slot, boolean>
}

// Composes `aria-labelledby` / `aria-describedby` id lists from the slots
// currently registered (those with a positive reference count).
function bucketAriaIds(
	present: Record<string, Record<string, number>>,
	slots: Record<string, A11yRelation> | undefined,
): { labelledby: string[]; describedby: string[] } {
	const labelledby: string[] = []
	const describedby: string[] = []

	for (const key of Object.keys(slots ?? {})) {
		const slotCounts = present[key]

		if (!slotCounts) continue

		const target = slots?.[key] === 'labelledby' ? labelledby : describedby

		for (const [idValue, count] of Object.entries(slotCounts)) {
			if (count > 0) target.push(idValue)
		}
	}

	return { labelledby, describedby }
}

/**
 * Universal accessibility scope: a stable id plus slot-driven `aria-labelledby`
 * / `aria-describedby` wiring. Declare named slots and the relation each feeds;
 * the matching part registers on mount and the composed attributes reference
 * only the slots present in the DOM, never a dangling id. Specialized hooks
 * (`useA11yPanel`, `useA11yControl`) layer their slot vocabulary over this base.
 *
 * @typeParam Slot - Union of declared slot names; keys `ids`, `register`, and
 * `registered`.
 * @returns An `A11yScope`: the stable `id` and `sub` deriver, per-slot `ids`,
 * the per-slot `register` mount registrars, the composed `ariaProps`, and
 * per-slot `registered` presence flags.
 * @see {@link useA11yPanel}
 * @see {@link useA11yControl}
 */
export function useA11yScope<Slot extends string = never>(
	options: A11yScopeOptions<Slot> = {},
): A11yScope<Slot> {
	const { id, slots } = options

	const scope = useIdScope({ id })

	// Per slot, a multiset of the ids currently registered (rendered id → mount
	// count). Reference-counting keeps the id live while any instance holds it.
	const [present, setPresent] = useState<Record<string, Record<string, number>>>({})

	const ids = useMemo(() => {
		const out = {} as Record<Slot, string>

		for (const key of Object.keys(slots ?? {}) as Slot[]) out[key] = scope.sub(key)

		return out
	}, [scope.sub, slots])

	const register = useMemo(() => {
		const out = {} as Record<Slot, (renderedId?: string) => () => void>

		for (const key of Object.keys(slots ?? {}) as Slot[]) {
			out[key] = (renderedId?: string) => {
				const resolved = renderedId ?? ids[key]

				setPresent((prev) => {
					const slot = prev[key] ?? {}

					return { ...prev, [key]: { ...slot, [resolved]: (slot[resolved] ?? 0) + 1 } }
				})

				return () =>
					setPresent((prev) => {
						const slot = { ...(prev[key] ?? {}) }

						const next = (slot[resolved] ?? 0) - 1

						if (next <= 0) delete slot[resolved]
						else slot[resolved] = next

						return { ...prev, [key]: slot }
					})
			}
		}

		return out
	}, [slots, ids])

	const buckets = useMemo(() => bucketAriaIds(present, slots), [present, slots])

	// `useAriaIds` is a hook; it cannot run inside the bucketing loop above.
	const labelledby = useAriaIds(...buckets.labelledby)
	const describedby = useAriaIds(...buckets.describedby)

	const ariaProps = useMemo(
		() => ({ 'aria-labelledby': labelledby, 'aria-describedby': describedby }),
		[labelledby, describedby],
	)

	const registered = useMemo(() => {
		const out = {} as Record<Slot, boolean>

		for (const key of Object.keys(slots ?? {}) as Slot[]) {
			const slotCounts = present[key]

			out[key] = !!slotCounts && Object.values(slotCounts).some((count) => count > 0)
		}

		return out
	}, [present, slots])

	return useMemo(
		() => ({ id: scope.id, sub: scope.sub, ids, register, ariaProps, registered }),
		[scope.id, scope.sub, ids, register, ariaProps, registered],
	)
}
