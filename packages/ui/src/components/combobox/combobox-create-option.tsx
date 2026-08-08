'use client'

import type { ReactNode } from 'react'
import { ComboboxOption } from './combobox-option'
import { useComboboxQuery } from './use-combobox-query'

/** Props for {@link ComboboxCreateOption}. */
export type ComboboxCreateOptionProps = {
	/**
	 * Labels the list already holds. The row withdraws when the query names one of
	 * them — compared trimmed and case-insensitively, which is how a reader takes
	 * two spellings of one name — so an existing option is chosen rather than
	 * duplicated beside itself.
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
}

/**
 * The "create what was typed" row of a type-ahead {@link Combobox}: an option
 * whose value is the trimmed query, so a name that matches nothing can still be
 * committed. Renders nothing while the query is blank or already {@link
 * ComboboxCreateOptionProps.taken}.
 *
 * Place it after the filtered options in `children`, which is where a reader
 * looks for it — the matches answer the query first, and creating is what is
 * left when none of them do:
 *
 * ```tsx
 * <Combobox value={name} onValueChange={setName} displayValue={(v: string) => v}>
 *   <MatchingNames />
 *   <ComboboxCreateOption taken={names} />
 * </Combobox>
 * ```
 *
 * Selecting it is an ordinary option selection — `onValueChange` fires with the
 * typed string, and the panel closes — so nothing has to distinguish a created
 * value from a chosen one downstream. Enter commits it without a deliberate
 * arrow-down when it is the only row left, which is the common case for a name
 * nothing matches.
 *
 * @remarks
 * Client component. The row's value is the query *string*, so the enclosing
 * combobox is one over strings; a combobox over objects needs its own create row
 * that mints the object.
 *
 * Reads `deferredQuery`, the same text the panel's own filtering and highlight
 * anchoring key on, so the row appears in the frame the matches update in and
 * the highlight lands on it rather than trailing a frame behind.
 */
export function ComboboxCreateOption({ taken, children, className }: ComboboxCreateOptionProps) {
	const { deferredQuery } = useComboboxQuery()

	const name = deferredQuery.trim()

	if (!name) return null

	const folded = name.toLowerCase()

	if (taken?.some((label) => label.trim().toLowerCase() === folded)) return null

	return (
		<ComboboxOption value={name} className={className}>
			{children ? children(name) : `Create “${name}”`}
		</ComboboxOption>
	)
}
