/**
 * Panel bridge — slot bundle shared by `dialog`, `drawer`, and `sheet`. A
 * pure bridge: it receives the `panel` token bundle plus the kata's
 * caller-supplied recipes and stitches them into the standard slot bundle
 * (title / description / header / body / footer / close), referencing kiso
 * in neither value nor type.
 *
 * Each kata's panel has its own variant axes (size + surface + side for
 * sheet, surface for drawer, size + surface for dialog), so unlike
 * `control` / `check` the bridge doesn't own the variants. The kata
 * defines them via its own `defineRecipe` call and hands the result to
 * `panel(t, { … })`, which composes the bundle's `layout` with caller
 * extras.
 */

/** The slice of the `panel` token bundle the bridge reads. */
type PanelTokens = {
	layout: {
		title: readonly string[]
		description: readonly string[]
		header: string
		body: readonly string[]
		footer: readonly string[]
	}
}

type Slot = {
	/** Classes appended after the `panel.layout.*` default for this slot. */
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
 * Build the panel slot bundle from the `panel` tokens and the caller input.
 *
 * `panel` and (optional) `backdrop` are caller-supplied `defineRecipe(...)`
 * results — they carry the kata's variants and stay callable, so consumers
 * keep `VariantProps<typeof result.panel>` inference. The other slots are
 * zero-variant class fragments built from the bundle's `layout` plus
 * optional caller extras.
 */
export function panel<P, B = undefined>(
	t: PanelTokens,
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
	const { layout } = t

	return {
		panel: input.panel,
		// `B` defaults to `undefined` when the caller omits backdrop; the
		// cast normalises the optional field to match the return. When B
		// is inferred from a passed recipe, the cast is a no-op.
		backdrop: input.backdrop as B,
		title: [...layout.title, ...toArray(input.title?.extra)],
		description: [...layout.description, ...toArray(input.description?.extra)],
		header: [layout.header, ...toArray(input.header?.extra)],
		body: [...layout.body, ...toArray(input.body?.extra)],
		footer: [...layout.footer, ...toArray(input.footer?.extra)],
		close: toArray(input.close?.base),
	}
}
