'use client'

import { createElement, isValidElement, type ReactNode, useLayoutEffect, useMemo } from 'react'
import { cn, dataAttr } from '../../core'
import { useMountHold } from '../../primitives/mount'
import { MountPresence } from '../../primitives/mount/mount-presence'
import * as m from '../../primitives/reduced-motion/reduced-motion-elements'
import { k } from '../../recipes/kata/tree'
import { flattenFragments } from '../../utilities/children'
import { TreeContext, TreePositionContext, useTreeContext } from './context'
import { ITEM_SELECTOR } from './tree-constants'

/**
 * Stamps each element child with its 1-based sibling position via
 * `TreePositionContext`, feeding the items' `aria-posinset`/`aria-setsize`.
 * The children of a Fragment count as siblings at this level, because a
 * Fragment adds no tree level.
 */
export function stampTreePositions(children: ReactNode): ReactNode {
	const items = flattenFragments(children)

	const setsize = items.filter(({ node }) => isValidElement(node)).length

	let index = 0

	return items.map(({ node, key }) => {
		if (!isValidElement(node)) return node

		index += 1

		return createElement(TreePositionContext, { key, value: { posinset: index, setsize } }, node)
	})
}

/**
 * When an item of a closed group holds the Tab stop, demotes each item of the
 * group and gives the stop to the branch row that owns the group.
 */
function seatStopOnBranch(group: HTMLElement | null): void {
	const items = group ? Array.from(group.querySelectorAll<HTMLElement>(ITEM_SELECTOR)) : []

	if (!items.some((item) => item.tabIndex === 0)) return

	for (const item of items) item.tabIndex = -1

	const branch = group
		?.closest('[data-slot="tree-item"]')
		?.querySelector<HTMLElement>(ITEM_SELECTOR)

	if (branch) branch.tabIndex = 0
}

/** Hoisted: `TreeItemChildren` renders once per branch, and this never varies. */
const DEFER = { defer: true } as const

type TreeItemChildrenProps = {
	/** The id that the treeitem row refers to through `aria-owns`. */
	id: string
	open: boolean
	label: ReactNode
	children: ReactNode
}

/**
 * A branch's collapsible `role="group"`. Under the tree's `mount` policy a
 * closed branch either unmounts (`active`) or rests in `<Activity mode="hidden">`
 * (`lazy`, `always`).
 *
 * @remarks
 * A held group stays mounted, so its items keep their own uncontrolled open
 * state across a parent's collapse. That is the reason the policy exists. It
 * therefore animates between its open and closed states in place, rather than
 * entering and exiting. It rests only once the closing height transition lands,
 * since `display: none` cannot animate.
 *
 * @internal
 */
export function TreeItemChildren({ id, open, label, children }: TreeItemChildrenProps) {
	const { depth, indent, mount } = useTreeContext()

	const hold = useMountHold(open, mount, DEFER)

	const childContextValue = useMemo(
		() => ({ depth: depth + 1, indent, mount }),
		[depth, indent, mount],
	)

	// A held group that closes stays mounted, and roving does not see its
	// `data-open` change. When a caller closes it while one of its items holds
	// the Tab stop, that item keeps the stop in a hidden group, and Tab skips the
	// tree. Move the stop to the branch row that closed.
	useLayoutEffect(() => {
		if (!open) seatStopOnBranch(document.getElementById(id))
	}, [open, id])

	const group = (motionProps: object) => (
		<TreeContext value={childContextValue}>
			<m.div
				id={id}
				role="group"
				aria-label={typeof label === 'string' ? label : undefined}
				data-slot="tree-group"
				// Roving skips the items of a group without this mark. See `ROVING_ITEM_SELECTOR`.
				data-open={dataAttr(open)}
				{...motionProps}
				className={cn(indent && k.group.indent)}
			>
				{stampTreePositions(children)}
			</m.div>
		</TreeContext>
	)

	return (
		<MountPresence open={open} hold={hold} preset={k.motion} name="tree-group">
			{group}
		</MountPresence>
	)
}
