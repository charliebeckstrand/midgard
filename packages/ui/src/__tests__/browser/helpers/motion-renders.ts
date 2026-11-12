/** The part of a React fiber that the count reads. */
type Fiber = {
	type: unknown
	flags: number
	child: Fiber | null
	sibling: Fiber | null
	alternate: Fiber | null
}

/** React sets this flag on each fiber that rendered in the commit. */
const PERFORMED_WORK = 1

/** A Motion `m.*` element: a `forwardRef` around `MotionDOMComponent`. */
function isMotionElement(fiber: Fiber): boolean {
	const render = (fiber.type as { render?: { name?: string } } | null)?.render

	return render?.name === 'MotionDOMComponent'
}

/**
 * The Motion elements that rendered in the last commit of the root in
 * `container`. React keeps no public count, so this reads the current fiber
 * tree. A subtree that React skipped keeps the child of its old fiber, so the
 * walk does not go into it.
 */
export function motionRenders(container: HTMLElement): number {
	const key = Object.keys(container).find((name) => name.startsWith('__reactContainer$'))

	const host = key ? (container as unknown as Record<string, Fiber>)[key] : undefined

	const root = (host as unknown as { stateNode: { current: Fiber } } | undefined)?.stateNode.current

	if (!root) throw new Error('expected a React root in the container')

	let count = 0

	const walk = (first: Fiber | null) => {
		for (let fiber = first; fiber; fiber = fiber.sibling) {
			const old = fiber.alternate

			const rendered = old === null || (fiber.flags & PERFORMED_WORK) !== 0

			if (rendered && isMotionElement(fiber)) count += 1

			if (old === null || fiber.child !== old.child) walk(fiber.child)
		}
	}

	walk(root.child)

	return count
}
