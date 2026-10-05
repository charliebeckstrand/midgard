'use client'

import type { ReactNode } from 'react'
import { ComboboxOption } from './combobox-option'
import { useComboboxQuery } from './use-combobox-query'

/** Props for {@link ComboboxCreateOption}. */
export type ComboboxCreateOptionProps = {
	/**
	 * Labels the list already holds. The row withdraws when the query names one of
	 * them. The comparison is trimmed and case-insensitive, which is how a reader
	 * takes two spellings of one name. An existing option is therefore chosen,
	 * rather than duplicated beside itself.
	 *
	 * Omit it only when the enclosing list can hold a repeat.
	 */
	taken?: string[]
	/**
	 * Label for the row, given the trimmed query.
	 *
	 * @defaultValue `Create “{name}”`
	 */
	children?: (name: string) => ReactNode
	className?: string
	/**
	 * Explicit id, which replaces the id that the row makes. Set it when the row
	 * is one of the `items` of a `VirtualOptions` with `getOptionId`. Give it the
	 * id that `getOptionId` returns for that item. The host points
	 * `aria-activedescendant` at that id before the row mounts.
	 */
	id?: string
}

/**
 * The "create what was typed" row of a type-ahead {@link Combobox}. It is an
 * option whose value is the trimmed query, so a name that matches nothing can
 * still be committed. Renders nothing while the query is blank or already {@link
 * ComboboxCreateOptionProps.taken}.
 *
 * Place it after the filtered options in `children`, which is where a reader
 * looks for it. With `VirtualOptions`, put it into the `items`, after the
 * matches, and give it the `id` that `getOptionId` returns for its item. The
 * matches answer the query first, and creating is what is left when none of
 * them do:
 *
 * ```tsx
 * <Combobox value={name} onValueChange={setName} displayValue={(v: string) => v}>
 *   <MatchingNames />
 *   <ComboboxCreateOption taken={names} />
 * </Combobox>
 * ```
 *
 * Selecting it is an ordinary option selection: `onValueChange` fires with the
 * typed string, and the panel closes. Nothing therefore has to distinguish a
 * created value from a chosen one downstream. Enter commits it without a deliberate
 * arrow-down when it is the only row left, which is the common case for a name
 * nothing matches.
 *
 * @remarks
 * Client component. The row's value is the query *string*, so the enclosing
 * combobox is one over strings. A combobox over objects needs its own create row
 * that mints the object.
 *
 * The label reads `deferredQuery`, the same text the panel's own filtering and
 * highlight anchoring key on. The row therefore appears in the frame the
 * matches update in, and the highlight lands on it rather than trailing a frame
 * behind. The value is the live `query`, so a commit before the deferred query
 * catches up gets the full typed name. The label can trail the value by one
 * render. The row renders only when both texts name something to create.
 */
export function ComboboxCreateOption({
	taken,
	children,
	className,
	id,
}: ComboboxCreateOptionProps) {
	const { query, deferredQuery } = useComboboxQuery()

	const name = deferredQuery.trim()

	const value = query.trim()

	if (!isCreatable(name, taken) || !isCreatable(value, taken)) return null

	return (
		<ComboboxOption id={id} value={value} className={className}>
			{children ? children(name) : `Create “${name}”`}
		</ComboboxOption>
	)
}

/**
 * Tells whether `name`, a trimmed query, names something to create. A blank
 * name does not, and a name that one of `taken` holds does not.
 *
 * @internal
 */
function isCreatable(name: string, taken: string[] | undefined): boolean {
	if (!name) return false

	const folded = name.toLowerCase()

	return !taken?.some((label) => label.trim().toLowerCase() === folded)
}
