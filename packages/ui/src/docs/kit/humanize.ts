import { capitalizeFirst } from '../../utilities/capitalize-first.ts'

/**
 * An identifier or a file name as words in sentence case: `groupTotalRow`
 * gives `Group total row`, and `with-icon` gives `With icon`.
 */
export function humanize(identifier: string): string {
	return capitalizeFirst(
		identifier
			.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
			.replace(/[-_]+/g, ' ')
			.toLowerCase(),
	)
}
