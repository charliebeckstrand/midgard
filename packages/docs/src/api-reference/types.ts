/**
 * A resolved `{@link}` target lifted out of a TSDoc description, keyed in
 * `links` by the target name written in the comment. Backs the hover card
 * behind the rendered reference, mirroring an editor's quick-info popover.
 */
export type DocLink = {
	/** One-line signature header, e.g. `type KbdProps` or `function Item(…): …`. */
	signature?: string
	/** The target's own TSDoc summary. */
	summary?: string
}

export type PropDef = {
	name: string
	/** Type expression as written in source, e.g. `DataTableColumn<T>[]`. */
	type: string
	/** Prose summary from the prop's TSDoc, with `@`-tags stripped. `{@link}` tokens are normalized; their resolved detail lives in `links`. */
	description?: string
	/** Resolved `{@link}` targets referenced in `description`, keyed by target name. */
	links?: Record<string, DocLink>
	/** Present and `true` only for required props; absent reads as optional. */
	required?: boolean
	/**
	 * Source text of every named type appearing in `type`, including names
	 * nested inside generics, arrays, function signatures, and tuples.
	 */
	references?: Record<string, string>
	default?: string
	/** First `@example` block from the prop's TSDoc, verbatim. */
	example?: string
	/** `@deprecated` message, or `true` when the tag carried no text. */
	deprecated?: string | boolean
	/** External package the type originates from, e.g. `@floating-ui/react`. */
	externalFrom?: string
}

/**
 * HTML pass-through inherited from the underlying DOM element: the
 * component spreads `...props` onto a `<tag>` and surfaces all its attrs.
 */
export type PassThrough = {
	element: string
	omitted?: string[]
}

export type ComponentApi = {
	name: string
	/** Component-level TSDoc summary: the `/** … *\/` above the function. `{@link}` tokens are normalized; their resolved detail lives in `links`. */
	description?: string
	/** Resolved `{@link}` targets referenced in `description`, keyed by target name. */
	links?: Record<string, DocLink>
	props: PropDef[]
	passThrough?: PassThrough[]
}
