'use client'

import { useCallback, useState } from 'react'
import { useControllable } from '../../hooks'
import { toggleItem } from '../../utilities'

export function toggleExpandedSet(
	expanded: Set<string>,
	path: string,
	onChange: (next: Set<string>) => void,
) {
	onChange(toggleItem(expanded, path))
}

const NONE: ReadonlySet<string> = new Set()

type JsonTreeExpansion = {
	/** The controlled set of open paths. `undefined` leaves the tree uncontrolled. */
	expanded: Set<string> | undefined
	/** Called when the controlled set changes. The uncontrolled arm does not call it. */
	onExpandedChange: ((expanded: Set<string>) => void) | undefined
	/** Nested levels open by default in the uncontrolled arm. */
	defaultExpandDepth: number
	/** Paths that open by default in the uncontrolled arm, such as the search matches. */
	autoOpen?: ReadonlySet<string>
}

/**
 * Open state for the virtualized {@link JsonTree}.
 *
 * @remarks
 * A controlled tree resolves each branch from the `expanded` set alone. An
 * uncontrolled tree keeps only the user's toggles. It resolves each other
 * branch per render: an `autoOpen` path opens, then a branch above
 * `defaultExpandDepth` opens. The recursive variant uses the same order. Thus
 * a `data` value that arrives after the mount opens to the depth default.
 *
 * @internal
 */
export function useJsonTreeExpansion({
	expanded,
	onExpandedChange,
	defaultExpandDepth,
	autoOpen = NONE,
}: JsonTreeExpansion): {
	isOpen: (path: string, depth: number) => boolean
	toggle: (path: string, open: boolean) => void
	expand: (paths: Set<string>) => void
} {
	const controlled = expanded !== undefined

	const [resolved = NONE, setExpanded] = useControllable<Set<string>>({
		value: expanded,
		onValueChange: (next) => onExpandedChange?.(next ?? new Set()),
	})

	const [userOpen, setUserOpen] = useState<ReadonlyMap<string, boolean>>(() => new Map())

	const isOpen = useCallback(
		(path: string, depth: number) => {
			if (controlled) return resolved.has(path)

			return userOpen.get(path) ?? (autoOpen.has(path) || depth < defaultExpandDepth)
		},
		[controlled, resolved, userOpen, autoOpen, defaultExpandDepth],
	)

	/** Flips the branch at `path`. `open` is its current resolved state. */
	const toggle = useCallback(
		(path: string, open: boolean) => {
			if (controlled) {
				setExpanded((prev) => toggleItem(prev ?? new Set<string>(), path))

				return
			}

			setUserOpen((prev) => new Map(prev).set(path, !open))
		},
		[controlled, setExpanded],
	)

	/** Union `paths` into the controlled set; identity-stable when nothing is new. */
	const expand = useCallback(
		(paths: Set<string>) => {
			// Bail before the setter. `useControllable` reports each call, also a
			// call whose updater returns the previous set.
			if ([...paths].every((path) => resolved.has(path))) return

			setExpanded((prev) => new Set([...(prev ?? []), ...paths]))
		},
		[resolved, setExpanded],
	)

	return { isOpen, toggle, expand }
}
