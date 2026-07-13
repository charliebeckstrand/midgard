import type { ComponentType } from 'react'

/** Author defaults for the usage engine, set in a doc's front-matter `usage` block. */
export type UsageAuthorConfig = {
	/** Baseline synthesis richness; visitor knobs override. @defaultValue 'typical' */
	complexity?: 'minimal' | 'typical' | 'rich'

	/** Vocabulary domain for synthesized strings and data. @defaultValue 'generic' */
	domain?: 'generic' | 'people' | 'commerce' | 'geo'

	/** Props the synthesizer must always set. */
	include?: string[]

	/** Props the synthesizer must never set. */
	exclude?: string[]

	/** Provider components to wrap generated usage in, e.g. `['UIProvider']`. */
	wrap?: string[]

	/** Force live rendering on or off, overriding the kind's default. */
	live?: boolean
}

/** One documented surface: the parsed identity of a `content/**` markdown file. */
export type DocMeta = {
	/** Route id and registry key: `<category>/<slug>`. */
	id: string

	/** First directory under `content/` — an open set; each becomes a sidebar section. */
	category: string

	/** File stem: `button`, `use-controllable`. */
	slug: string

	/** Display name — the doc's sole h1. */
	name: string

	/** The first paragraph after the h1, as raw Markdown. */
	description: string

	/** Import specifier of the documented module, e.g. `ui/button`. */
	module: string

	/** Exported symbols this doc covers; defaults resolve against the module's API. */
	symbols?: string[]

	usage?: UsageAuthorConfig
}

/** One ordered slice of a doc's body, rendered in sequence by the Preview tab. */
export type BodySegment =
	| { t: 'prose'; md: string }
	| { t: 'preview'; index: number }
	| { t: 'snippet'; code: string; lang: string }

/** A `tsx preview` fence: its verbatim source plus a loader for the compiled module. */
export type PreviewBlock = {
	title?: string

	/** Owning h2 text, when the fence sits under one. */
	section?: string

	/** Verbatim fence body, shown in the collapsible code block. */
	source: string

	load: () => Promise<{ default: ComponentType }>
}

/** The module shape every transformed `content/**` markdown file exports. */
export type DocModule = {
	meta: DocMeta
	body: BodySegment[]
	previews: PreviewBlock[]
}
