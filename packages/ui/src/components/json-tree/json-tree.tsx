'use client'

import { type KeyboardEvent, useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useA11yRoving } from '../../hooks'
import { useKeyedStore } from '../../hooks/use-keyed-store'
import { k } from '../../recipes/kata/json-tree'
import { treeMoveForKey, treeMoveTarget } from '../tree/tree-keyboard'
import { JsonTreeContext } from './context'
import { JsonTreeNode } from './json-tree-node'
import {
	buildSearchIndex,
	collectMatchPaths,
	type JsonTreeCollapsible,
	type JsonTreeSearch,
	normalizeSearch,
} from './json-tree-utilities'
import { JsonTreeVirtualized } from './json-tree-virtualized'
import type { JsonValue } from './types'
import { toggleExpandedSet, unionExpandedSet } from './use-json-tree-expansion'
import { useJsonTreeSearchSeed } from './use-json-tree-search-seed'

/** Row-virtualization options for {@link JsonTree}: the required scroll-container `maxHeight`, plus optional windowing tuning. */
export type JsonTreeVirtualize = { maxHeight: string; estimateSize?: number; overscan?: number }

/** Props for {@link JsonTree}: the `data` value, expansion controls, `search`, and optional `virtualize` windowing. */
export type JsonTreeProps = {
	/** The JSON value to render. */
	data: JsonValue
	/** Root label (renders as the root key). */
	rootKey?: string
	/**
	 * Nested levels open by default. Pass `Infinity` to expand everything.
	 * @defaultValue 1
	 */
	defaultExpandDepth?: number
	/**
	 * Which branches the reader can open and close: `true` for each branch,
	 * `false` for none, `'root'` for the root only, and `'children'` for each
	 * branch under the root.
	 *
	 * @remarks
	 * A branch that does not collapse stays open, whatever `defaultExpandDepth`,
	 * `expanded`, or `search` gives. Its row has no chevron, and the reader
	 * cannot toggle it. Use `false` when a surrounding control, such as a
	 * `Collapse`, already shows and hides the tree.
	 *
	 * @defaultValue true
	 */
	collapsible?: JsonTreeCollapsible
	/**
	 * Controlled set of expanded node paths. When provided, the tree becomes
	 * controlled and `onExpandedChange` fires on toggle. A `search` term adds
	 * the branches that hold a match to the set through `onExpandedChange`.
	 */
	expanded?: Set<string>
	/** Called when the expanded set changes (controlled mode). */
	onExpandedChange?: (expanded: Set<string>) => void
	/**
	 * Search term to highlight and auto-expand matching nodes. Pass a string or
	 * `{ value, filter }` to also hide non-matching nodes.
	 *
	 * @remarks
	 * A controlled tree opens a match through `onExpandedChange`: the tree adds
	 * the branches that hold a match to `expanded`. It does this one time for
	 * each new term or `data` value, so a seeded branch stays collapsible.
	 */
	search?: JsonTreeSearch
	/**
	 * Enables row virtualization with `{ maxHeight }` (the cap on the scroll
	 * container) plus optional `estimateSize` / `overscan`. Flattens the visible
	 * tree into a linear list and renders only the viewport slice plus overscan.
	 * Expand/collapse is instant (no animation); leave this off when the
	 * animation matters.
	 *
	 * @remarks
	 * `maxHeight` alone is enough. The tree sizes itself from its content, up to
	 * the cap, and then scrolls. A fixed height from `className` also works, under
	 * the same cap. Each rendered row measures its real height, and a long value
	 * that wraps makes a taller row. `estimateSize` is only the first guess for a
	 * row that has not rendered yet. A guess near the usual row height keeps the
	 * scrollbar steady.
	 */
	virtualize?: JsonTreeVirtualize
	/**
	 * Accessible name for the tree.
	 *
	 * @defaultValue The `rootKey`, or `'JSON'` with no `rootKey`.
	 */
	'aria-label'?: string
	/** Id of a visible element that names the tree. It replaces the default `aria-label`. */
	'aria-labelledby'?: string
	className?: string
}

/** Reads whether a path is in the controlled expanded set. */
function expansionReader(expanded: ReadonlySet<string> | undefined): (path: string) => boolean {
	return (path) => expanded?.has(path) ?? false
}

/**
 * Collapsible `role="tree"` view for an arbitrary {@link JsonValue}. Expands to
 * `defaultExpandDepth` by default, or runs controlled via `expanded` /
 * `onExpandedChange`; `collapsible` keeps some or all branches open; `search` highlights and auto-expands matching nodes (and
 * hides non-matches in filter mode). Roving-focus keyboard navigation moves
 * between tree items. `ArrowRight` opens a closed branch or moves to the first
 * child of an open one. `ArrowLeft` closes an open branch or moves to the
 * parent. The two keys swap in a right-to-left layout. Under `virtualize`,
 * flattens the visible tree to a linear list and renders only the viewport
 * slice plus overscan. There, Home, End and the arrows also reach rows outside
 * the window: the tree scrolls the row in and focuses it when it mounts.
 *
 * @remarks
 * Client component. `virtualize` carries its own `maxHeight` and
 * disables expand/collapse animation.
 */
export function JsonTree({
	data,
	rootKey,
	defaultExpandDepth = 1,
	collapsible = true,
	expanded,
	onExpandedChange,
	search,
	virtualize,
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledby,
	className,
}: JsonTreeProps) {
	const ref = useRef<HTMLDivElement>(null)

	// A tree needs a name. A visible label replaces the default.
	const label = ariaLabelledby === undefined ? (ariaLabel ?? rootKey ?? 'JSON') : ariaLabel

	// Outlives the nodes that write it, so a collapsed-then-reopened branch
	// restores the expansions made inside it. See `JsonTreeContext.userOpen`.
	const userOpen = useRef(new Map<string, boolean>())

	const { value: searchValue, filter } = normalizeSearch(search)

	const controlled = expanded !== undefined

	// The open state of each path in the controlled set. A node reads its own
	// path, so a new set renders only the nodes whose open state changed.
	const expansion = useKeyedStore(expanded, expansionReader)

	// The latest set and handler, for a toggle that keeps its identity.
	const latest = useRef({ expanded, onExpandedChange })

	useLayoutEffect(() => {
		latest.current = { expanded, onExpandedChange }
	}, [expanded, onExpandedChange])

	// Controlled without a handler is read-only, as a controlled input with no
	// `onChange` is.
	const toggleExpanded = useCallback((path: string) => {
		const { expanded: current, onExpandedChange: report } = latest.current

		if (current && report) toggleExpandedSet(current, path, report)
	}, [])

	// Keyed on `data` identity, so a structurally identical value with a new
	// identity rebuilds the whole index. Correct as written: a content equality
	// walk would cost more than the rebuild it avoids.
	const searchIndex = useMemo(() => buildSearchIndex(data, searchValue), [data, searchValue])

	const windowed = virtualize != null

	// Every branch whose subtree holds a search match. Also keyed on `data`, so
	// the set follows a new payload. A controlled tree takes the set as a seed,
	// and the windowed variant also opens it when uncontrolled. The uncontrolled
	// recursive variant finds its matches per node, so it skips the walk.
	const matchPaths = useMemo(
		() =>
			searchValue && (controlled || windowed)
				? collectMatchPaths(data, rootKey, searchIndex)
				: undefined,
		[controlled, windowed, searchValue, data, rootKey, searchIndex],
	)

	// Union the paths into the controlled set. Reports nothing when the set
	// already holds each path, or when the tree has no handler.
	const expandControlled = useCallback((paths: ReadonlySet<string>) => {
		const { expanded: current, onExpandedChange: report } = latest.current

		if (!current || !report) return

		const next = unionExpandedSet(current, paths)

		if (next) report(next)
	}, [])

	// A controlled walk follows only `expanded`, so the match paths go into the
	// set as a seed. One seed serves both variants.
	useJsonTreeSearchSeed(controlled ? matchPaths : undefined, expandControlled)

	const handleRovingKeyDown = useA11yRoving(ref, {
		itemSelector: '[role="treeitem"]',
		orientation: 'vertical',
		// The recursive variant gives its one Tab stop to roving, which moves the
		// stop to the row that takes focus. Then Tab re-enters on the row that the
		// reader left. The windowed variant seats the stop on a mounted row itself.
		manageTabIndex: !windowed,
	})

	// The horizontal arrows of the tree model: to the first child of an open
	// branch, or to the parent of a closed branch or a leaf. A branch row opens
	// and closes itself first and cancels the event. The windowed variant moves
	// over its flat rows, because the target row can be outside the window.
	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLDivElement>) => {
			const container = ref.current

			const item = event.target

			if (event.defaultPrevented || !container || !(item instanceof HTMLElement)) return

			const move = treeMoveForKey(event, item.getAttribute('aria-expanded') === 'true')

			if (move === null) {
				handleRovingKeyDown(event)

				return
			}

			event.preventDefault()

			treeMoveTarget(container, item, move)?.focus()
		},
		[handleRovingKeyDown],
	)

	// One identity until an input of the tree changes. A new value would render
	// each node, because each node reads the context.
	const contextValue = useMemo(
		() => ({
			depth: 0,
			defaultExpandDepth,
			collapsible,
			search: searchValue,
			filter,
			searchIndex,
			path: '',
			controlled,
			expansion,
			toggleExpanded,
			userOpen,
		}),
		[
			defaultExpandDepth,
			collapsible,
			searchValue,
			filter,
			searchIndex,
			controlled,
			expansion,
			toggleExpanded,
		],
	)

	if (windowed) {
		return (
			<JsonTreeVirtualized
				ref={ref}
				data={data}
				rootKey={rootKey}
				defaultExpandDepth={defaultExpandDepth}
				collapsible={collapsible}
				expandedProp={expanded}
				onExpandedChange={onExpandedChange}
				searchValue={searchValue}
				filter={filter}
				searchIndex={searchIndex}
				matchPaths={matchPaths}
				virtualize={virtualize}
				maxHeight={virtualize.maxHeight}
				onKeyDown={handleRovingKeyDown}
				aria-label={label}
				aria-labelledby={ariaLabelledby}
				className={className}
			/>
		)
	}

	return (
		<JsonTreeContext value={contextValue}>
			<div
				ref={ref}
				role="tree"
				aria-label={label}
				aria-labelledby={ariaLabelledby}
				data-slot="json-tree"
				className={cn(k.base, className)}
				onKeyDown={handleKeyDown}
			>
				<JsonTreeNode keyName={rootKey} value={data} />
			</div>
		</JsonTreeContext>
	)
}
