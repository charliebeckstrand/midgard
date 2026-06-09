'use client'

import { useCallback } from 'react'
import { useControllable } from '../../hooks'
import { toggleInSet } from '../../utilities'

export function toggleExpandedSet(
	expanded: Set<string>,
	path: string,
	onChange: (next: Set<string>) => void,
) {
	onChange(toggleInSet(expanded, path))
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
			setExpanded((prev) => toggleInSet(prev ?? new Set<string>(), path))
		},
		[setExpanded],
	)

	return { expanded: resolved, toggle }
}
