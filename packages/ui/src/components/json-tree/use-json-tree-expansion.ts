'use client'

import { useCallback, useState } from 'react'

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
	const controlled = expanded !== undefined

	const [internalExpanded, setInternalExpanded] = useState<Set<string>>(initial)

	const resolved = controlled ? expanded : internalExpanded

	const toggle = useCallback(
		(path: string) => {
			if (controlled && onExpandedChange) {
				toggleExpandedSet(expanded, path, onExpandedChange)

				return
			}

			setInternalExpanded((prev) => {
				const next = new Set(prev)

				if (next.has(path)) next.delete(path)
				else next.add(path)

				return next
			})
		},
		[controlled, expanded, onExpandedChange],
	)

	return { expanded: resolved, toggle }
}
