'use client'

import { useCallback } from 'react'
import { useControllable } from '../../hooks'
import { toggleItem } from '../../utilities'

export function toggleExpandedSet(
	expanded: Set<string>,
	path: string,
	onChange: (next: Set<string>) => void,
) {
	onChange(toggleItem(expanded, path))
}

type JsonTreeExpansion = {
	initial: () => Set<string>
	expanded: Set<string> | undefined
	onExpandedChange: ((expanded: Set<string>) => void) | undefined
}

export function useJsonTreeExpansion({ initial, expanded, onExpandedChange }: JsonTreeExpansion): {
	expanded: Set<string>
	toggle: (path: string) => void
	expand: (paths: Set<string>) => void
} {
	const [resolved = new Set<string>(), setExpanded] = useControllable<Set<string>>({
		value: expanded,
		defaultValue: initial,
		onValueChange: (next) => onExpandedChange?.(next ?? new Set()),
	})

	const toggle = useCallback(
		(path: string) => {
			setExpanded((prev) => toggleItem(prev ?? new Set<string>(), path))
		},
		[setExpanded],
	)

	/** Union `paths` into the expanded set; identity-stable when nothing is new. */
	const expand = useCallback(
		(paths: Set<string>) => {
			setExpanded((prev) => {
				const base = prev ?? new Set<string>()

				let changed = false

				const next = new Set(base)

				for (const path of paths) {
					if (!next.has(path)) {
						next.add(path)

						changed = true
					}
				}

				return changed ? next : base
			})
		},
		[setExpanded],
	)

	return { expanded: resolved, toggle, expand }
}
