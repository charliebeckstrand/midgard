'use client'

import { AnimatePresence, motion } from 'motion/react'
import { Children, createElement, Fragment, isValidElement, type ReactNode, useMemo } from 'react'
import { Hold, useMountHold } from '../../primitives/mount'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { k } from '../../recipes/kata/tree'
import { TreeContext, TreePositionContext, useTreeContext } from './context'

type FlatChild = { node: ReactNode; key: string }

// Recurse into Fragments, because a Fragment adds no tree level: its items are
// rendered siblings of the items around it. `Children.forEach` keeps the slot
// index of a `false` child, so a sibling key does not shift when a conditional
// item toggles. Each key carries its Fragment path, so keys stay unique in one
// flat list. Mirrors `flattenChildren` in `use-group.ts`.
function flattenTreeChildren(children: ReactNode, prefix = ''): FlatChild[] {
	const result: FlatChild[] = []

	Children.forEach(children, (child, index) => {
		if (isValidElement(child) && child.type === Fragment) {
			result.push(
				...flattenTreeChildren(
					(child.props as { children?: ReactNode }).children,
					`${prefix}${index}.`,
				),
			)

			return
		}

		const ownKey = isValidElement(child) && child.key != null ? child.key : String(index)

		result.push({ node: child, key: `${prefix}${ownKey}` })
	})

	return result
}

/**
 * Stamps each element child with its 1-based sibling position via
 * `TreePositionContext`, feeding the items' `aria-posinset`/`aria-setsize`.
 * The children of a Fragment count as siblings at this level.
 */
export function stampTreePositions(children: ReactNode): ReactNode {
	const items = flattenTreeChildren(children)

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
export function TreeItemChildren({ open, label, children }: TreeItemChildrenProps) {
	const { depth, size, indent, mount } = useTreeContext()

	const hold = useMountHold(open, mount, DEFER)

	const childContextValue = useMemo(
		() => ({ depth: depth + 1, size, indent, mount }),
		[depth, size, indent, mount],
	)

	const group = (motionProps: object) => (
		<TreeContext value={childContextValue}>
			<motion.div
				role="group"
				aria-label={typeof label === 'string' ? label : undefined}
				data-slot="tree-group"
				{...motionProps}
				className={k.group}
			>
				{stampTreePositions(children)}
			</motion.div>
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
			<Hold hold={hold} name="tree-group">
				{group({
					// A `lazy` group mounts on its first open and so enters from the
					// closed state; an `always` group is present from the start and takes
					// its open-or-closed state without playing anything.
					initial: mount === 'lazy' ? k.motion.initial : false,
					// Held, so it animates between the two states in place — no `exit`,
					// which only `AnimatePresence` reads.
					animate: open ? k.motion.animate : k.motion.exit,
					transition: k.motion.transition,
					// `rest` ignores a landing that arrives while open, so the entrance
					// passes through without a guard here.
					onAnimationComplete: hold.rest,
				})}
			</Hold>
		</ReducedMotion>
	)
}
