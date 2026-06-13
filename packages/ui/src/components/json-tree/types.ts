/** Any JSON-serializable value: primitive, `null`, array, or object of `JsonValue`s. */
export type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonValue[]
	| { [key: string]: JsonValue }
