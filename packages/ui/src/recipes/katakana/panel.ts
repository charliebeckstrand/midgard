/**
 * Panel applicator — slot bundle shared by `dialog`, `drawer`, and
 * `sheet`.
 *
 * Each kata's panel has its own variant axes (size + surface + side for
 * sheet, surface for drawer, size + surface for dialog), so unlike
 * `control` / `check`, the applicator doesn't own the variants. The
 * kata defines them via its own `defineRecipe` call and hands the result
 * to `panel(...)`, which stitches it into the standard slot bundle
 * (title / description / header / body / footer / close) by composing
 * `narabi.panel` with caller extras.
 *
 * Like `popover` and `segment`, `panel` doesn't fit `defineApplicator`'s
 * shape and hand-rolls — see `katakana/index.ts` for how the three
 * exceptions sit alongside the helper.
 */

import { narabi } from '../kiso'

type Slot = {
	/** Classes appended after the `narabi.panel.*` default for this slot. */
	extra?: string | string[]
}

type Base = {
	base: string | string[]
}

type PanelInput<P, B = undefined> = {
	/** Recipe for the panel root element. Defines positioning, size, glass, etc. */
	panel: P
	/** Recipe for the backdrop. Present on modal variants (dialog, drawer, sheet). */
	backdrop?: B
	/** Extra padding / layout for the Title slot. */
	title?: Slot
	/** Extra padding / layout for the Description slot. */
	description?: Slot
	/** Extra padding / layout for the Header slot (the optional title + description wrapper). */
	header?: Slot
	/** Extra padding / layout for the Body slot. */
	body?: Slot
	/** Extra padding / layout for the Footer slot. */
	footer?: Slot
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
 * `panel` and (optional) `backdrop` are caller-supplied
 * `defineRecipe(...)` results — they carry the kata's variants and stay
 * callable, so consumers keep `VariantProps<typeof result.panel>`
 * inference. The other slots (title, description, header, body, footer,
 * close) are zero-variant class fragments built from `narabi.panel` plus
 * optional caller extras, applied via `cn(...)` at the call site.
 *
 * The function name `panel` collides visually with the field
 * `input.panel`; the JS syntax (parens vs colon) keeps them distinct at
 * call sites.
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
	footer: string[]
	close: string[]
} {
	return {
		panel: input.panel,
		// `B` defaults to `undefined` when the caller omits backdrop; the
		// cast normalises the optional field to match the return. When B
		// is inferred from a passed recipe, the cast is a no-op.
		backdrop: input.backdrop as B,
		title: [...narabi.panel.title, ...toArray(input.title?.extra)],
		description: [...narabi.panel.description, ...toArray(input.description?.extra)],
		header: [narabi.panel.header, ...toArray(input.header?.extra)],
		body: [...narabi.panel.body, ...toArray(input.body?.extra)],
		footer: [...narabi.panel.footer, ...toArray(input.footer?.extra)],
		close: toArray(input.close?.base),
	}
}
