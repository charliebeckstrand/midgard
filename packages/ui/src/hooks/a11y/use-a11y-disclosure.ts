'use client'

import { useMemo } from 'react'
import type { AriaProps } from '../../types'
import { useIdScope } from '../use-id-scope'

export type A11yDisclosureOptions = {
	/**
	 * Scope base id; falls back to a generated one. Pass a shared base when a
	 * trigger and panel rendered as separate components must derive matching
	 * ids; combine it with `key` to discriminate each pair.
	 */
	id?: string
	/** Per-pair discriminator when many disclosures share one base id. */
	key?: string | number
	/**
	 * Drives `aria-expanded` on the trigger. Omit for triggers that express
	 * state another way (a tab's `aria-selected`, a step's `aria-current`).
	 */
	expanded?: boolean
}

export type A11yDisclosure = {
	/** Id the trigger renders with: the panel's `aria-labelledby` target. */
	triggerId: string
	/** Id the panel renders with: the trigger's `aria-controls` target. */
	panelId: string
	/** Spread onto the trigger: `id`, `aria-controls`, and `aria-expanded` when supplied. */
	triggerProps: AriaProps & {
		id: string
		'aria-controls': string
	}
	/** Spread onto the panel: `id` and `aria-labelledby`. */
	panelProps: AriaProps & {
		id: string
		'aria-labelledby': string
	}
}

/**
 * Non-modal trigger↔panel pairing: the reciprocal `aria-controls` /
 * `aria-labelledby` (plus optional `aria-expanded`) wiring shared by disclosure
 * widgets: collapse, accordion, tabs, stepper. Derives a matched id pair from a
 * scoped base and hands back a prop bag for each side. Distinct from
 * `useA11yPanel` (modal dialog roots: `role` + `aria-modal`) and `useA11yScope`
 * (slot-aggregated labelling).
 *
 * Call it once where both ids are visible to both sides (e.g. the
 * component's context provider) or, when the trigger and panel are independent
 * components, call it in each with a shared `id` plus a per-pair `key`; the
 * ids derive purely from those, and both calls produce the same pair.
 *
 * @returns An `A11yDisclosure`: the matched `triggerId` / `panelId` and a
 * `triggerProps` / `panelProps` bag to spread onto each side (`aria-expanded`
 * present on `triggerProps` only when `expanded` is supplied).
 * @see {@link useA11yPanel}
 * @see {@link useA11yScope}
 */
export function useA11yDisclosure({
	id,
	key,
	expanded,
}: A11yDisclosureOptions = {}): A11yDisclosure {
	const scope = useIdScope({ id })

	const keyPart = key === undefined ? '' : `-${key}`

	const triggerId = scope.sub(`trigger${keyPart}`)

	const panelId = scope.sub(`panel${keyPart}`)

	return useMemo(
		() => ({
			triggerId,
			panelId,
			triggerProps: {
				id: triggerId,
				'aria-controls': panelId,
				...(expanded === undefined ? {} : { 'aria-expanded': expanded }),
			},
			panelProps: {
				id: panelId,
				'aria-labelledby': triggerId,
			},
		}),
		[triggerId, panelId, expanded],
	)
}
