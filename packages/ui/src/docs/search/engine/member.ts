import { normalize } from './tokenize.ts'

/**
 * The prop or the event of `entry` that a word of `query` names, such as
 * `variant` for the query `button variant`. A pick of the entry then goes to
 * the row of that prop. It gives `undefined` when no word is the name of a
 * member.
 */
export function findMember(
	entry: { members?: readonly string[] },
	query: string,
): string | undefined {
	const words = new Set(normalize(query).split(' '))

	return entry.members?.find((member) => words.has(normalize(member)))
}
