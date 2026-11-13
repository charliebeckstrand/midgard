'use client'

import { AnimatePresence } from 'motion/react'
import { memo, useId, useMemo, useState } from 'react'
import { dataAttr } from '../../core/data-attr'
import { useKeyedValue } from '../../hooks/use-keyed-value'
import { ReducedMotion } from '../../primitives/reduced-motion'
import * as m from '../../primitives/reduced-motion/reduced-motion-elements'
import { k } from '../../recipes/kata/json-tree'
import { JsonTreeContext, useJsonTreeContext } from './context'
import { JsonTreeBranchClose } from './json-tree-branch-close'
import { JsonTreeBranchHeader } from './json-tree-branch-header'
import { JsonTreeLeafRow } from './json-tree-leaf-row'
import {
	encodePathSegment,
	getEntries,
	isBranch,
	isCollapsibleDepth,
	joinPath,
	unpackNodeSearch,
} from './json-tree-utilities'
import type { JsonValue } from './types'
import { useEntriesSearch } from './use-json-tree-search'

/** Props for {@link JsonTreeNode}. @internal */
type JsonNodeProps = {
	keyName?: string | number
	value: JsonValue
	/** The packed search state of the node, from its parent, or from {@link JsonTreeRoot} for the root. */
	searchState: number
}

/**
 * A leaf row that renders only when its props change. A branch renders its
 * leaf entries as these rows, with no node of their own, so a branch that
 * renders for one entry does not render the other rows.
 */
const JsonTreeLeaf = memo(JsonTreeLeafRow)

/**
 * Resolves a branch's open state by precedence. A branch that does not
 * collapse stays open. Then a branch that the filter empties stays closed. Then comes the user's explicit toggle, then the search
 * auto-open, then the depth default. Controlled trees defer entirely to the expanded set.
 *
 * @internal
 */
function resolveOpen(options: {
	collapsible: boolean
	controlled: boolean
	expandedHas: boolean
	/** The filter is on, and no entry of the branch stays. A controlled or fixed branch ignores it. */
	forcedClosed: boolean
	userOpen: boolean | undefined
	/** The subtree holds a match, so it holds at least one entry. */
	hasMatch: boolean
	depth: number
	defaultExpandDepth: number
}): boolean {
	if (!options.collapsible) return true

	if (options.controlled) return options.expandedHas

	if (options.forcedClosed) return false

	if (options.userOpen !== undefined) return options.userOpen

	if (options.hasMatch) return true

	return options.depth < options.defaultExpandDepth
}

/**
 * Renders one node of a {@link JsonTree}: a leaf row for scalars, or a branch
 * header plus its (collapsible) children, recursing per entry. Reads tree config
 * from {@link useJsonTreeContext} and resolves open state through
 * {@link resolveOpen}, honoring controlled `expanded`, search filtering, and
 * the depth default.
 */
export const JsonTreeNode = memo(JsonTreeNodeView)

/** The body of {@link JsonTreeNode}, declared apart from its `memo` so the recursion names the memoized node. @internal */
function JsonTreeNodeView({ keyName, value, searchState }: JsonNodeProps) {
	const {
		depth,
		defaultExpandDepth,
		collapsible: treeCollapsible,
		search,
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

	// The parent gives the node its search state, so a new term renders the node
	// only when its own state changes.
	const { highlighted, hasMatch, filtered, hidden, kept } = unpackNodeSearch(searchState)

	const count = filtered ? kept : entries.length

	// Explicit user toggle; `undefined` defers to the default/search rules below.
	// Seeded from the tree-level memory so a node that was toggled, unmounted by
	// an ancestor collapsing, and remounted comes back the way the user left it.
	// The branch row owns its group by this id, which keeps two trees apart.
	const groupId = useId()

	const [userOpen, setUserOpenState] = useState<boolean | undefined>(() =>
		userOpenMemory.current.get(nodePath),
	)

	const forcedClosed = filtered && count === 0

	const collapsible = isCollapsibleDepth(treeCollapsible, depth)

	const open = resolveOpen({
		collapsible,
		controlled,
		expandedHas,
		forcedClosed,
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
			searchIndex,
			nodePath,
			controlled,
			expansion,
			toggleExpanded,
			userOpenMemory,
		],
	)

	// Only the root can hide itself, because a parent leaves out each entry that
	// the filter hides.
	if (hidden) return null

	const isArray = Array.isArray(value)

	// Only a root leaf comes here, because a branch renders each leaf entry as a
	// row.
	if (!branch) {
		return (
			<JsonTreeLeafRow depth={depth} keyName={keyName} value={value} highlighted={highlighted} />
		)
	}

	const handleToggle = () => {
		if (controlled) {
			// No local state here: it would surface as a surprise jump if the
			// consumer later dropped `expanded`.
			toggleExpanded(nodePath)
		} else {
			// While the filter forces the branch closed, a press records nothing. A
			// write here would open the branch when the search clears.
			if (collapsible && forcedClosed) return

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
				onToggle={handleToggle}
			/>
			<ReducedMotion>
				<AnimatePresence initial={false}>
					{open && (
						<m.div
							id={groupId}
							role="group"
							data-slot="json-group"
							// The motion element drops the stamp while the group leaves.
							data-open={dataAttr(open)}
							// No clip of its own: the motion clips the group only while its height
							// moves.
							{...k.motion}
						>
							{/* The children are one depth in, and the close bracket aligns with the header. */}
							<div className={k().indent}>
								<JsonTreeContext value={childContextValue}>
									<JsonTreeEntries entries={entries} />
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

/** Props for {@link JsonTreeEntries}. @internal */
type JsonTreeEntriesProps = {
	entries: [string | number, JsonValue][]
}

/**
 * The entries of an open branch. The list reads the search state of each entry
 * and gives it to the entry. It sits below the motion group of the branch, so a
 * new term that changes the state of an entry renders the list and that entry,
 * not the branch and its motion group.
 *
 * @internal
 */
const JsonTreeEntries = memo(function JsonTreeEntries({ entries }: JsonTreeEntriesProps) {
	const { depth, search, searchIndex } = useJsonTreeContext()

	const states = useEntriesSearch(search, searchIndex, entries)

	return entries.map(([key, value], index) => {
		const state = states?.[index] ?? 0

		const entry = unpackNodeSearch(state)

		// The filter hides the entry.
		if (entry.hidden) return null

		return isBranch(value) ? (
			<JsonTreeNode key={String(key)} keyName={key} value={value} searchState={state} />
		) : (
			<JsonTreeLeaf
				key={String(key)}
				depth={depth}
				keyName={key}
				value={value}
				highlighted={entry.highlighted}
			/>
		)
	})
})
