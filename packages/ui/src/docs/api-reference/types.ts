export type PropDef = {
	name: string
	/** Type expression as written in source, e.g. `DataTableColumn<T>[]`. */
	type: string
	/**
	 * Source text of every named type appearing in `type`, including names
	 * nested inside generics, arrays, function signatures, and tuples.
	 */
	references?: Record<string, string>
	default?: string
	/** External package the type originates from, e.g. `@floating-ui/react`. */
	externalFrom?: string
	/** JSDoc summary from the prop's declaration. */
	description?: string
	/**
	 * Present only when the caller must supply the prop: declared without `?`
	 * and, when the props type is a union, present in every arm.
	 */
	required?: boolean
	/**
	 * Usage snippet applying only this prop, for props whose type alone
	 * doesn't show the call shape (event handlers, object configs). Authored
	 * `@example` JSDoc wins over generation.
	 */
	usage?: string
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
	props: PropDef[]
	passThrough?: PassThrough[]
}
