export type PropDef = {
	name: string
	/** Type expression as written in source, e.g. "DataTableColumn<T>[]" */
	type: string
	/**
	 * Definitions of named types appearing anywhere in the type expression —
	 * including those nested inside generics, arrays, function params/returns,
	 * and tuples. Object bodies are summarized to their key list for display.
	 */
	references?: Record<string, string>
	default?: string
	/** Package name when the type is imported from an external library (e.g. "@floating-ui/react") */
	externalFrom?: string
}

/**
 * Represents a natural HTML pass-through (e.g. `ComponentPropsWithoutRef<'button'>`).
 * Components that spread `...props` onto a DOM element inherit all of that element's attrs.
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

export type CvaVariant = {
	name: string
	options: string[]
	defaultValue?: string
}

/** Shared resolution context passed across files so cross-module refs resolve. */
export type ResolutionContext = {
	typeDefs: Map<string, string>
	cvaVariants: Map<string, CvaVariant[]>
	/** Type name → external package name (e.g. "Placement" → "@floating-ui/react") */
	externalImports: Map<string, string>
}
