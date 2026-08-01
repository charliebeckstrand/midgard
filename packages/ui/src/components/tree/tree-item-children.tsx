'use client'

import { AnimatePresence, motion } from 'motion/react'
import { Children, createElement, isValidElement, type ReactNode, useMemo } from 'react'
import { Hold, useMountHold } from '../../primitives/mount'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { k } from '../../recipes/kata/tree'
import { TreeContext, TreePositionContext, useTreeContext } from './context'

/**
 * Stamps each element child with its 1-based sibling position via
 * `TreePositionContext`, feeding the items' `aria-posinset`/`aria-setsize`.
 */
export function stampTreePositions(children: ReactNode): ReactNode {
	const items = Children.toArray(children)

	const setsize = items.filter((child) => isValidElement(child)).length

	let index = 0

	return items.map((child) => {
		if (!isValidElement(child)) return child

		index += 1

		return createElement(
			TreePositionContext,
			{ key: child.key ?? index, value: { posinset: index, setsize } },
			child,
		)
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
 * state across a parent's collapse — the reason the policy exists. It therefore
 * animates between its open and closed states in place rather than entering and
 * exiting, and rests only once the closing height transition lands, since
 * `display: none` cannot animate.
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
