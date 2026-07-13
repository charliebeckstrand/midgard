// The wire contract between the extractor and any docs app. Pure data types —
// this module must never import from `typescript`; the ts6 dependency stops at
// this package's boundary, and consumers only ever see JSON matching these
// shapes.

/** Version stamp consumers gate on before trusting a snapshot. */
export const SCHEMA_VERSION = 1

/** One extraction run over a package's public surface, keyed by import specifier. */
export type ApiSnapshot = {
	schemaVersion: typeof SCHEMA_VERSION
	modules: Record<string, ModuleApi>
}

/** Everything one entry point (`ui/button`) exports. */
export type ModuleApi = {
	specifier: string
	exports: SymbolApi[]
}

/** One documented export, discriminated on `kind`. */
export type SymbolApi = ComponentApi | CallableApi | OtherApi

/** A React component export: its authored props and pass-through surface. */
export type ComponentApi = {
	kind: 'component'
	name: string
	description?: string
	props: PropDef[]
	passThrough?: PassThrough[]
}

/** A hook (`/^use[A-Z]/`) or plain function export. */
export type CallableApi = {
	kind: 'hook' | 'function'
	name: string
	description?: string
	signatures: SignatureApi[]
	deprecated?: string | boolean
}

/** Any export the extractor recognizes but does not model — nothing errors, everything renders. */
export type OtherApi = {
	kind: 'other'
	name: string
	description?: string
}

/** One overload of a callable. */
export type SignatureApi = {
	typeParams?: string[]
	params: ParamApi[]
	returns: {
		type: string
		description?: string
		references?: Record<string, string>
	}
}

/** One parameter of a callable signature. */
export type ParamApi = {
	name: string

	/** Type expression as written in source. */
	type: string

	/** Checker-classified structure for the usage engine; display stays on `type`. */
	shape?: TypeShape
	description?: string
	optional?: boolean
	default?: string
}

/** One prop of a component. */
export type PropDef = {
	name: string

	/** Type expression as written in source, e.g. `GridColumn<T>[]`. */
	type: string

	/** Checker-classified structure for the usage engine; display stays on `type`. */
	shape?: TypeShape

	/** Prose summary from the prop's TSDoc, with `@`-tags stripped; `{@link}` tokens are normalized to canonical form for the renderer. */
	description?: string

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
 * HTML pass-through inherited from the underlying DOM element: the component
 * spreads `...props` onto a `<tag>` and surfaces all its attrs.
 */
export type PassThrough = {
	element: string
	omitted?: string[]
}

/**
 * Checker-classified type structure, computed at build time so the usage
 * engine never parses type strings at runtime. Bounded depth, cycle-guarded;
 * anything past the budget degrades to `opaque`.
 */
export type TypeShape =
	| { k: 'literal-union'; members: (string | number | boolean)[] }
	| { k: 'primitive'; name: 'string' | 'number' | 'boolean' }
	| { k: 'array'; element: TypeShape }
	| { k: 'object'; fields: Record<string, TypeShape> }
	| { k: 'fn'; arity: number }
	| { k: 'react-node' }
	| { k: 'opaque' }
