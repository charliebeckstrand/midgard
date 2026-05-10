import { narabi } from '../ryu/narabi'

type Slot = {
	/** Classes appended after the narabi.panel.* default for this slot. */
	extra?: string | string[]
}

type Base = { base: string | string[] }

type PanelRecipeInput<P, B> = {
	/** tv() result for the panel root element. Defines positioning, size, glass, etc. */
	panel: P
	/** tv() result for the backdrop. Present on modal variants (dialog, drawer, sheet). */
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
 * The `panel` and (optional) `backdrop` slots are caller-supplied `tv()` results
 * — they carry real variants (size, surface, side) and stay callable so consumers
 * keep `VariantProps<typeof result.panel>` inference. The other slots (title,
 * description, header, body, actions, close) are zero-variant class fragments
 * built from `narabi.panel` plus optional caller-supplied extras; they are
 * returned as `string[]` and applied via `cn(...)` at the call site.
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
