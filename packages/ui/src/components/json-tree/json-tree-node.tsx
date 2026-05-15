'use client'

import { AnimatePresence, motion } from 'motion/react'
import { memo, useEffect, useMemo, useState } from 'react'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { ugoki } from '../../recipes'
import { k } from '../../recipes/kata/json-tree'
import { JsonTreeProvider, useJsonTreeContext } from './context'
import { JsonTreeBranchClose } from './json-tree-branch-close'
import { JsonTreeBranchHeader } from './json-tree-branch-header'
import { JsonTreeLeafRow } from './json-tree-leaf-row'
import { filterEntries, getEntries, isBranch, matchesSearch } from './json-tree-utilities'
import type { JsonValue } from './types'
import { toggleExpandedSet } from './use-json-tree-expansion'

type JsonNodeProps = {
	keyName?: string | number
	value: JsonValue
}

export const JsonTreeNode = memo(function JsonTreeNode({ keyName, value }: JsonNodeProps) {
	const {
		depth,
		defaultExpandDepth,
		search,
		filter,
		searchIndex,
		path,
		expanded,
		onExpandedChange,
	} = useJsonTreeContext()

	const nodePath = path ? `${path}.${keyName ?? '$'}` : String(keyName ?? '$')

	const controlled = expanded !== undefined

	const branch = isBranch(value)

	const entries = useMemo(() => getEntries(value), [value])

	const highlighted = matchesSearch(keyName, value, search)

	const hasMatch = branch && search ? searchIndex.get(value as object) === true : false

	const [localOpen, setLocalOpen] = useState(depth < defaultExpandDepth)

	const open = controlled ? expanded.has(nodePath) : localOpen

	const visibleEntries = useMemo(
		() => (filter && search ? filterEntries(entries, search, searchIndex) : entries),
		[entries, filter, search, searchIndex],
	)

	const empty = visibleEntries.length === 0

	const childContextValue = useMemo(
		() => ({
			depth: depth + 1,
			defaultExpandDepth,
			search,
			filter,
			searchIndex,
			path: nodePath,
			expanded,
			onExpandedChange,
		}),
		[depth, defaultExpandDepth, search, filter, searchIndex, nodePath, expanded, onExpandedChange],
	)

	useEffect(() => {
		if (controlled) return

		if (!search) {
			setLocalOpen(depth < defaultExpandDepth)

			return
		}

		if (hasMatch && !empty) setLocalOpen(true)

		if (filter && empty) setLocalOpen(false)
	}, [search, hasMatch, filter, empty, depth, defaultExpandDepth, controlled])

	if (filter && search && !branch && !highlighted) return null

	const isArray = Array.isArray(value)

	const count = visibleEntries.length

	if (!branch) {
		return (
			<JsonTreeLeafRow depth={depth} keyName={keyName} value={value} highlighted={highlighted} />
		)
	}

	const toggle = () => {
		if (controlled && onExpandedChange) {
			toggleExpandedSet(expanded, nodePath, onExpandedChange)
		} else {
			setLocalOpen((prev) => !prev)
		}
	}

	return (
		<div data-slot="json-node" data-highlighted={highlighted || undefined}>
			<JsonTreeBranchHeader
				depth={depth}
				keyName={keyName}
				isArray={isArray}
				open={open}
				count={count}
				highlighted={highlighted}
				onToggle={toggle}
			/>
			<ReducedMotion>
				<AnimatePresence initial={false}>
					{open && (
						<motion.div data-slot="json-group" {...ugoki.collapse.fade} className={k.group}>
							<JsonTreeProvider value={childContextValue}>
								{visibleEntries.map(([childKey, childValue]) => (
									<JsonTreeNode key={String(childKey)} keyName={childKey} value={childValue} />
								))}
							</JsonTreeProvider>
							<JsonTreeBranchClose depth={depth} isArray={isArray} />
						</motion.div>
					)}
				</AnimatePresence>
			</ReducedMotion>
		</div>
	)
})
