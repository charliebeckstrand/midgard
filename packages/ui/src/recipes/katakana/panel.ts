/**
 * Panel applicator — slot bundle shared by `dialog`, `drawer`, and
 * `sheet`. Each kata's panel needs its own variant axes (size, surface,
 * side for sheet; surface for drawer; size + surface for dialog), so
 * unlike `control` / `check`, the applicator doesn't own the variant
 * axes — the kata defines them via its own `defineRecipe` call and hands
 * the result to `panel(...)`. The applicator stitches those caller-owned
 * recipes into the standard slot bundle (title / description / header /
 * body / actions / close), composing `narabi.panel` with caller extras.
 *
 * This is the third applicator shape in the katakana layer:
 *   - `control` / `check` — applicator owns the recipe (kata supplies a
 *     thin overlay; `defineApplicator` + `applyRecipe` handle it)
 *   - `popover` / `segment` — applicator owns the bundle (kata calls a
 *     zero- or low-arg function and reads back the bundle)
 *   - `panel` — kata owns the recipe; applicator wraps it with slots
 */

import { narabi } from '../kiso'

type Slot = {
	/** Classes appended after the `narabi.panel.*` default for this slot. */
	extra?: string | string[]
}

type Base = {
	base: string | string[]
}

/**
 * Per-call configuration for the panel applicator. The kata supplies
 * `defineRecipe(...)` results for `panel` (and optionally `backdrop`),
 * plus per-slot extras for the standard slot bundle.
 */
export type PanelInput<P, B = undefined> = {
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
 * Build the panel slot bundle.
 *
 * `panel` and (optional) `backdrop` are caller-supplied `defineRecipe(...)`
 * results — they carry the kata's variants (size, surface, side, …) and
 * stay callable, so consumers keep `VariantPropsOf<typeof result.panel>`
 * inference. The other slots (title, description, header, body, actions,
 * close) are zero-variant class fragments built from `narabi.panel` plus
 * optional caller extras, applied via `cn(...)` at the call site.
 *
 * The function name `panel` mirrors the field name `input.panel` — the
 * outer call carries parentheses, the inner field carries a colon, so
 * the JS syntax keeps them visually distinct.
 */
export function panel<P, B = undefined>(
	input: PanelInput<P, B>,
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
