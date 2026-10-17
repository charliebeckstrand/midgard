import { createElement, Fragment, type ReactNode } from 'react'
import { englishIntl } from '../../primitives/intl/intl-catalog'
import { selectedMessage } from '../../primitives/intl/intl-messages'
import { capitalizeFirst } from '../../utilities'

/**
 * The label of the trigger. With `capitalize`, each selected value that is a
 * string takes a capital first letter, as each option label does. A node renders
 * as the caller wrote it.
 *
 * In `multiple` mode, a comma and a space join three or fewer values. Strings
 * join into one string. A node in the selection makes the join a node. More
 * values show as a count, which `formatCount` words in the language of the
 * reader.
 */
export function resolveLabel<T>({
	value,
	displayValue,
	multiple,
	capitalize = false,
	formatCount = englishCount,
}: {
	value: T | T[] | undefined
	displayValue?: (value: T) => ReactNode
	multiple: boolean
	capitalize?: boolean
	formatCount?: (count: number) => string
}): ReactNode {
	const display =
		displayValue && capitalize
			? (item: T) => {
					const label = displayValue(item)

					return typeof label === 'string' ? capitalizeFirst(label) : label
				}
			: displayValue

	if (multiple) {
		const values = Array.isArray(value) ? value : []

		if (values.length === 0) return undefined

		if (display && values.length <= 3) return joinLabels(values.map(display))

		return formatCount(values.length)
	}

	if (value !== undefined && !Array.isArray(value) && display) return display(value)

	return undefined
}

// The count of the selected values, in English, for a caller with no intl.
function englishCount(count: number) {
	return englishIntl.formatMessage(selectedMessage, { count })
}

/** Joins the labels with a comma and a space: as one string where each is a string, else as a node. @internal */
function joinLabels(labels: ReactNode[]): ReactNode {
	if (labels.every((label) => typeof label === 'string')) return labels.join(', ')

	return labels.map((label, index) =>
		// The index keys each label, because a label has no identity of its own.
		createElement(Fragment, { key: index }, index > 0 ? ', ' : null, label),
	)
}
