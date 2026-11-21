'use client'

import { type ComponentType, type ReactNode, useMemo } from 'react'
import type { JsonValue } from '../../../components/json-tree/types'
import { createContext } from '../../../core/create-context'
import type { QueryField, QueryOperator } from '../engine/types'

/**
 * Props for a {@link QueryValueEditor}: the field and the operator of the rule,
 * its value, and the state of the builder.
 */
export type QueryValueEditorProps = {
	/** The field of the rule. Its `editor` key selected this editor. */
	field: QueryField
	/**
	 * The operator of the rule. Its flags give the shape of the value: a set
	 * (`set`), a `[min, max]` pair (`range`), or else a single value.
	 */
	operator: QueryOperator
	/**
	 * The current value of the rule. It can have a shape that the operator does
	 * not read, such as a value that a URL holds. Read such a value as blank.
	 */
	value: JsonValue | undefined
	/**
	 * Receives the next value of the rule. Write the shape that the operator
	 * reads: a list of strings or numbers for a set, else one string or number.
	 * Write keys, not objects, and give the display text through the
	 * `formatValue` of the field.
	 */
	onValueChange: (value: JsonValue) => void
	/** The name of the value, such as "Customer value". Give it to the control that takes the focus. */
	'aria-label': string
	/** True when the builder is disabled. Disable each control of the editor. */
	disabled: boolean
	/**
	 * True when the nearest lock scope locks its controls, such as a `Form`
	 * while a submit runs. Keep the focus and show the value, but write no
	 * value. A control of `ui` in the editor reads the lock by itself.
	 */
	readOnly: boolean
	/** The class of the root of the editor. The builder sizes the editor to the part of the rule with it. */
	className?: string
}

/**
 * A custom value editor of a query rule: a component that edits the value of a
 * field whose `editor` key names it, such as a picker of related records or a
 * token input.
 *
 * @remarks The editor is one part of the rule row, so it keeps to these rules:
 *
 * - It is one Tab stop, or one stop for each of its controls, in the order of
 *   the row. It does not trap Tab.
 * - Escape in a popup of the editor closes that popup only.
 * - Its control that takes the focus is named by `aria-label`.
 */
export type QueryValueEditor = ComponentType<QueryValueEditorProps>

/** The custom value editors of the builders below a {@link QueryValueEditorProvider}, by key. @internal */
type QueryValueEditors = Readonly<Record<string, QueryValueEditor>>

const [QueryValueEditorsContext, useQueryValueEditors] = createContext<QueryValueEditors>(
	'QueryValueEditors',
	{ default: {} },
)

/** Props for {@link QueryValueEditorProvider}. */
export type QueryValueEditorProviderProps = {
	/**
	 * Each custom value editor, by the `editor` key of a field. Hoist the
	 * object out of the render, as a module constant or a `useMemo`.
	 */
	editors: Readonly<Record<string, QueryValueEditor>>
	/** The subtree whose builders render these editors. */
	children: ReactNode
}

/**
 * The registry of the custom value editors of each `QueryBuilder` below it, by
 * the `editor` key of a field.
 *
 * @remarks A field holds a key and not a component, so a field stays data that
 * JSON can hold, and the engine imports no React. The registry is a context,
 * so it reaches a builder that another module renders, such as the builder of
 * a dashboard. A key that no editor claims falls back to the input of the field
 * type.
 *
 * Nesting merges the registries. An inner provider adds its editors to those
 * of an outer provider, and wins on a key that they share.
 *
 * @example
 * ```tsx
 * const editors = { customer: CustomerPicker }
 *
 * <QueryValueEditorProvider editors={editors}>
 * 	<QueryBuilder fields={fields} />
 * </QueryValueEditorProvider>
 * ```
 */
export function QueryValueEditorProvider({ editors, children }: QueryValueEditorProviderProps) {
	const outer = useQueryValueEditors()

	const value = useMemo(() => ({ ...outer, ...editors }), [outer, editors])

	return <QueryValueEditorsContext value={value}>{children}</QueryValueEditorsContext>
}

/**
 * The custom value editor of `field`, or `undefined` when the field names no
 * key or no provider holds its key.
 *
 * @internal
 */
export function useQueryValueEditor(field: QueryField): QueryValueEditor | undefined {
	const editors = useQueryValueEditors()

	return field.editor && Object.hasOwn(editors, field.editor) ? editors[field.editor] : undefined
}
