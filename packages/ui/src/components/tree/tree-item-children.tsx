'use client'

import { AnimatePresence } from 'motion/react'
import { createElement, isValidElement, type ReactNode, useMemo } from 'react'
import { cn, dataAttr } from '../../core'
import { MountHold, useMountHold } from '../../primitives/mount'
import { heldMotionProps } from '../../primitives/mount/mount-held-motion'
import { useMountExitInert } from '../../primitives/mount/use-mount-exit-inert'
import { ReducedMotion } from '../../primitives/reduced-motion'
import * as m from '../../primitives/reduced-motion/reduced-motion-elements'
import { k } from '../../recipes/kata/tree'
import { flattenChildren } from '../../utilities/flatten-children'
import { TreeContext, TreePositionContext, useTreeContext } from './context'

/**
 * Stamps each element child with its 1-based sibling position via
 * `TreePositionContext`, feeding the items' `aria-posinset`/`aria-setsize`.
 * The children of a Fragment count as siblings at this level, because a
 * Fragment adds no tree level.
 */
export function stampTreePositions(children: ReactNode): ReactNode {
	const items = flattenChildren(children)

	const setsize = items.filter(({ node }) => isValidElement(node)).length

	let index = 0

	return items.map(({ node, key }) => {
		if (!isValidElement(node)) return node

		index += 1

		return createElement(TreePositionContext, { key, value: { posinset: index, setsize } }, node)
	})
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

	// The positions are stamped here, not in `TreeGroup`. A presence change then
	// renders the group again with the same children, so the rows do not render.
	const group = (motionProps: object) => (
		<TreeContext value={childContextValue}>
			<TreeGroup id={id} open={open} label={label} indent={indent} motion={motionProps}>
				{stampTreePositions(children)}
			</TreeGroup>
		</TreeContext>
	)

	// `active` unmounts the closed group, so its exit rides `AnimatePresence` and
	// the recipe's enter/exit pair applies as written.
	if (!hold.held) {
		return (
			<ReducedMotion>
				<AnimatePresence initial={false}>{open && group(k.motion)}</AnimatePresence>
			</ReducedMotion>
		)
	}

	if (!hold.present) return null

	return (
		<ReducedMotion>
			<MountHold hold={hold} name="tree-group">
				{group(heldMotionProps(k.motion, open, hold))}
			</MountHold>
		</ReducedMotion>
	)
}

/** Props for {@link TreeGroup}. @internal */
type TreeGroupProps = {
	id: string
	open: boolean
	label: ReactNode
	indent: boolean
	/** The motion props of the group: the recipe preset, or the held bag. */
	motion: object
	children: ReactNode
}

/**
 * The `role="group"` element of a branch. It is `inert` while it exits
 * ({@link useMountExitInert}). A held group does not exit, so it is inert only
 * while a group around it exits.
 *
 * @internal
 */
function TreeGroup({ id, open, label, indent, motion, children }: TreeGroupProps) {
	const exiting = useMountExitInert()

	return (
		<m.div
			id={id}
			role="group"
			aria-label={typeof label === 'string' ? label : undefined}
			data-slot="tree-group"
			// Roving skips the items of a held group without this mark. See `ROVING_ITEM_SELECTOR`.
			data-open={dataAttr(open)}
			{...motion}
			inert={exiting}
			className={cn(indent && k.group.indent)}
		>
			{children}
		</m.div>
	)
}
