export type PropDef = {
	name: string
	/** Type expression as written in source — e.g. `DataTableColumn<T>[]`. */
	type: string
	/**
	 * Source text of every named type appearing in `type`, including names
	 * nested inside generics, arrays, function signatures, and tuples.
	 */
	references?: Record<string, string>
	default?: string
	/** External package the type originates from — e.g. `@floating-ui/react`. */
	externalFrom?: string
}

/**
 * HTML pass-through inherited from the underlying DOM element — i.e. the
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
