'use client'

import { useCallback } from 'react'
import { useControllable } from '../../hooks'

export function toggleExpandedSet(
	expanded: Set<string>,
	path: string,
	onChange: (next: Set<string>) => void,
) {
	const next = new Set(expanded)

	if (next.has(path)) next.delete(path)
	else next.add(path)

	onChange(next)
}

type JsonTreeExpansion = {
	initial: () => Set<string>
	expanded: Set<string> | undefined
	onExpandedChange: ((expanded: Set<string>) => void) | undefined
}

export function useJsonTreeExpansion({ initial, expanded, onExpandedChange }: JsonTreeExpansion): {
	expanded: Set<string>
	toggle: (path: string) => void
} {
	const [resolved = new Set<string>(), setExpanded] = useControllable<Set<string>>({
		value: expanded,
		defaultValue: initial,
		onValueChange: (next) => onExpandedChange?.(next ?? new Set()),
	})

	const toggle = useCallback(
		(path: string) => {
			setExpanded((prev) => {
				const next = new Set(prev)

				if (next.has(path)) next.delete(path)
				else next.add(path)

				return next
			})
		},
		[setExpanded],
	)

	return { expanded: resolved, toggle }
}
