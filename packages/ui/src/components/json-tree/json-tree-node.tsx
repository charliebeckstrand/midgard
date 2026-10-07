'use client'

import { AnimatePresence } from 'motion/react'
import { memo, useId, useMemo, useState } from 'react'
import { cn, dataAttr } from '../../core'
import { useKeyedValue } from '../../hooks/use-keyed-store'
import { ReducedMotion } from '../../primitives/reduced-motion'
import * as m from '../../primitives/reduced-motion/reduced-motion-elements'
import { k } from '../../recipes/kata/json-tree'
import { JsonTreeContext, useJsonTreeContext } from './context'
import { JsonTreeBranchClose } from './json-tree-branch-close'
import { JsonTreeBranchHeader } from './json-tree-branch-header'
import { JsonTreeLeafRow } from './json-tree-leaf-row'
import {
	encodePathSegment,
	filterEntries,
	getEntries,
	isBranch,
	isCollapsibleDepth,
	joinPath,
	matchesSearch,
} from './json-tree-utilities'
import type { JsonValue } from './types'

/** Props for {@link JsonTreeNode}. @internal */
type JsonNodeProps = {
	keyName?: string | number
	value: JsonValue
}

/**
 * Resolves a branch's open state by precedence. A branch that does not
 * collapse stays open. Then a filtered-out empty branch stays closed. Then comes the user's explicit toggle, then the search
 * auto-open, then the depth default. Controlled trees defer entirely to the expanded set.
 *
 * @internal
 */
function resolveNodeOpen(opts: {
	collapsible: boolean
	controlled: boolean
	expandedHas: boolean
	search: string | undefined
	filter: boolean | undefined
	empty: boolean
	userOpen: boolean | undefined
	hasMatch: boolean
	depth: number
	defaultExpandDepth: number
}): boolean {
	if (!opts.collapsible) return true

	if (opts.controlled) return opts.expandedHas

	if (opts.search && opts.filter && opts.empty) return false

	if (opts.userOpen !== undefined) return opts.userOpen

	if (opts.search && opts.hasMatch && !opts.empty) return true

	return opts.depth < opts.defaultExpandDepth
}

/**
 * Renders one node of a {@link JsonTree}: a leaf row for scalars, or a branch
 * header plus its (collapsible) children, recursing per entry. Reads tree config
 * from {@link useJsonTreeContext} and resolves open state through
 * {@link resolveNodeOpen}, honoring controlled `expanded`, search filtering, and
 * the depth default.
 */
export const JsonTreeNode = memo(JsonTreeNodeView)

/** The body of {@link JsonTreeNode}, declared apart from its `memo` so the recursion names the memoized node. @internal */
function JsonTreeNodeView({ keyName, value }: JsonNodeProps) {
	const {
		depth,
		defaultExpandDepth,
		collapsible: treeCollapsible,
		search,
		filter,
		searchIndex,
		path,
		controlled,
		expansion,
		toggleExpanded,
		userOpen: userOpenMemory,
	} = useJsonTreeContext()

	const nodePath = path ? joinPath(path, keyName ?? '$') : encodePathSegment(keyName ?? '$')

	const branch = isBranch(value)

	// Only a controlled branch reads the expanded set, and it reads its own path.
	const expandedHas = useKeyedValue(controlled && branch ? expansion : null, nodePath, false)

	const entries = useMemo(() => getEntries(value), [value])

	const highlighted = matchesSearch(keyName, value, search)

	const hasMatch = branch && search ? searchIndex.get(value as object) === true : false

	// Explicit user toggle; `undefined` defers to the default/search rules below.
	// Seeded from the tree-level memory so a node that was toggled, unmounted by
	// an ancestor collapsing, and remounted comes back the way the user left it.
	// The branch row owns its group by this id, which keeps two trees apart.
	const groupId = useId()

	const [userOpen, setUserOpenState] = useState<boolean | undefined>(() =>
		userOpenMemory.current.get(nodePath),
	)

	const visibleEntries = useMemo(
		() => (filter && search ? filterEntries(entries, search, searchIndex) : entries),
		[entries, filter, search, searchIndex],
	)

	const empty = visibleEntries.length === 0

	const collapsible = isCollapsibleDepth(treeCollapsible, depth)

	const open = resolveNodeOpen({
		collapsible,
		controlled,
		expandedHas,
		search,
		filter,
		empty,
		userOpen,
		hasMatch,
		depth,
		defaultExpandDepth,
	})

	const childContextValue = useMemo(
		() => ({
			depth: depth + 1,
			defaultExpandDepth,
			collapsible: treeCollapsible,
			search,
			filter,
			searchIndex,
			path: nodePath,
			controlled,
			expansion,
			toggleExpanded,
			userOpen: userOpenMemory,
		}),
		[
			depth,
			defaultExpandDepth,
			treeCollapsible,
			search,
			filter,
			searchIndex,
			nodePath,
			controlled,
			expansion,
			toggleExpanded,
			userOpenMemory,
		],
	)

	if (filter && search && !branch && !highlighted) return null

	const isArray = Array.isArray(value)

	const count = visibleEntries.length

	if (!branch) {
		return (
			<JsonTreeLeafRow depth={depth} keyName={keyName} value={value} highlighted={highlighted} />
		)
	}

	const toggle = () => {
		if (controlled) {
			// No local state here: it would surface as a surprise jump if the
			// consumer later dropped `expanded`.
			toggleExpanded(nodePath)
		} else {
			// Write through to the tree-level memory as well as local state: local
			// state drives this render, the memory outlives an ancestor's collapse.
			userOpenMemory.current.set(nodePath, !open)

			setUserOpenState(!open)
		}
	}

	return (
		<div data-slot="json-node" data-highlighted={dataAttr(highlighted)}>
			<JsonTreeBranchHeader
				depth={depth}
				keyName={keyName}
				isArray={isArray}
				open={open}
				count={count}
				highlighted={highlighted}
				groupId={groupId}
				collapsible={collapsible}
				onToggle={toggle}
			/>
			<ReducedMotion>
				<AnimatePresence initial={false}>
					{open && (
						<m.div
							id={groupId}
							role="group"
							data-slot="json-group"
							// No clip of its own: the motion clips the group only while its height
							// moves.
							{...k.motion}
						>
							{/* The children are one depth in, and the close bracket aligns with the header. */}
							<div className={cn(k.indent)}>
								<JsonTreeContext value={childContextValue}>
									{visibleEntries.map(([childKey, childValue]) => (
										<JsonTreeNode key={String(childKey)} keyName={childKey} value={childValue} />
									))}
								</JsonTreeContext>
							</div>
							<JsonTreeBranchClose isArray={isArray} />
						</m.div>
					)}
				</AnimatePresence>
			</ReducedMotion>
		</div>
	)
}
