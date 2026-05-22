/**
 * Panel factory — slot bundle shared by dialog, drawer, and sheet kata.
 *
 * Wraps caller-supplied `panel` (and optional `backdrop`) recipes so they keep
 * their variant inference, and emits zero-variant class fragments for the
 * standard slots (title, description, header, body, actions, close) by
 * composing `narabi.panel` with caller extras.
 */

import { narabi } from '../kiso'

type Slot = {
	/** Classes appended after the narabi.panel.* default for this slot. */
	extra?: string | string[]
}

type Base = { base: string | string[] }

type PanelRecipeInput<P, B> = {
	/** Recipe for the panel root element. Defines positioning, size, glass, etc. */
	panel: P
	/** Recipe for the backdrop. Present on modal variants (dialog, drawer, sheet). */
	backdrop?: B
	/** Extra padding / layout for the Title slot. */
	title?: Slot
	/** Extra padding / layout for the Description slot. */
	description?: Slot
	/** Classes for the Header strip. */
	header?: Base
	/** Extra padding / layout for the Body slot. */
	body?: Slot
	/** Extra padding / layout for the Actions slot. */
	actions?: Slot
	/** Classes for the Close button. */
	close?: Base
}

function toArray(v?: string | string[]): string[] {
	if (v == null) return []
	return Array.isArray(v) ? v : [v]
}

/**
 * Factory for defining a panel recipe.
 *
 * `panel` and (optional) `backdrop` are caller-supplied `defineRecipe(...)`
 * results — they carry variants (size, surface, side) and stay callable so
 * consumers keep `VariantPropsOf<typeof result.panel>` inference. The other
 * slots (title, description, header, body, actions, close) are zero-variant
 * class fragments built from `narabi.panel` plus optional caller extras,
 * applied via `cn(...)` at the call site.
 */
export function definePanelRecipe<P, B = undefined>(
	input: PanelRecipeInput<P, B>,
): {
	panel: P
	backdrop: B
	title: string[]
	description: string[]
	header: string[]
	body: string[]
	actions: string[]
	close: string[]
} {
	return {
		panel: input.panel,
		backdrop: input.backdrop as B,
		title: [...narabi.panel.title, ...toArray(input.title?.extra)],
		description: [...narabi.panel.description, ...toArray(input.description?.extra)],
		header: toArray(input.header?.base),
		body: [...narabi.panel.body, ...toArray(input.body?.extra)],
		actions: [...narabi.panel.actions, ...toArray(input.actions?.extra)],
		close: toArray(input.close?.base),
	}
}
