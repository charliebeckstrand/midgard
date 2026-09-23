export type PropDef = {
	name: string
	/** Type expression as written in source, e.g. `GridColumn<T>[]`. */
	type: string
	/** Prose summary from the prop's TSDoc, with `@`-tags stripped. `{@link}` tokens are normalized; their resolved targets are in `links`. */
	description?: string
	/**
	 * The names of the `{@link}` targets in `description` that the link index
	 * resolves. The renderer shows each symbol reference as plain text. The
	 * extractor uses the names only to track the source file of each target.
	 */
	links?: string[]
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
	/** Component-level TSDoc summary: the `/** … *\/` above the function. `{@link}` tokens are normalized; their resolved targets are in `links`. */
	description?: string
	/** The names of the resolved `{@link}` targets in `description`. See {@link PropDef.links}. */
	links?: string[]
	props: PropDef[]
	passThrough?: PassThrough[]
}
