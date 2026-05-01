import { tv } from 'tailwind-variants'
import { narabi } from '../ryu/narabi'

type Slot = {
	/** Classes appended after the narabi.panel.* default for this slot. */
	extra?: string | string[]
}

type Base = { base: string | string[] }

type TVResult = ReturnType<typeof tv>

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
 * Narabi provides the panel root and backdrop (if applicable) slots, and the caller defines
 * the title, description, header, body, actions, and close slots via thin overrides.
 * This pattern allows for maximum reuse of the underlying panel structure
 * while enabling flexible customization of the individual slots.
 *
 * Each panel shares the same slot surface (title, description, body, actions, close)
 * backed by narabi.panel. The factory builds those slots from a thin override shape
 * and forwards caller-supplied tv() results for the unique parts (panel root + optional
 * backdrop). Callers keep full tv() type inference via `VariantProps<typeof result.panel>`.
 */
export function definePanelRecipe<P, B = undefined>(
	input: PanelRecipeInput<P, B>,
): {
	panel: P
	backdrop: B
	title: TVResult
	description: TVResult
	header: TVResult
	body: TVResult
	actions: TVResult
	close: TVResult
} {
	return {
		panel: input.panel,
		backdrop: input.backdrop as B,
		title: tv({ base: [...narabi.panel.title, ...toArray(input.title?.extra)] }),
		description: tv({
			base: [...narabi.panel.description, ...toArray(input.description?.extra)],
		}),
		header: tv({ base: input.header?.base ?? '' }),
		body: tv({ base: [...narabi.panel.body, ...toArray(input.body?.extra)] }),
		actions: tv({ base: [...narabi.panel.actions, ...toArray(input.actions?.extra)] }),
		close: tv({ base: input.close?.base ?? '' }),
	}
}
