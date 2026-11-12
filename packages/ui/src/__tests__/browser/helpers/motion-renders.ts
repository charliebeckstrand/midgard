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
 * The name of a component fiber: of its function, or of the render function of
 * a `forwardRef`. A `memo` fiber holds the function that it wraps as its type.
 */
function componentName(fiber: Fiber): string | undefined {
	const type = fiber.type

	if (typeof type === 'function') return type.name

	return (type as { render?: { name?: string } } | null)?.render?.name
}

/**
 * The fibers that match `match` and rendered in the last commit of the root in
 * `container`. React keeps no public count, so this reads the current fiber
 * tree. A subtree that React skipped keeps the child of its old fiber, so the
 * walk does not go into it.
 */
function countRenders(container: HTMLElement, match: (fiber: Fiber) => boolean): number {
	const key = Object.keys(container).find((name) => name.startsWith('__reactContainer$'))

	const host = key ? (container as unknown as Record<string, Fiber>)[key] : undefined

	const root = (host as unknown as { stateNode: { current: Fiber } } | undefined)?.stateNode.current

	if (!root) throw new Error('expected a React root in the container')

	let count = 0

	const walk = (first: Fiber | null) => {
		for (let fiber = first; fiber; fiber = fiber.sibling) {
			const old = fiber.alternate

			const rendered = old === null || (fiber.flags & PERFORMED_WORK) !== 0

			if (rendered && match(fiber)) count += 1

			if (old === null || fiber.child !== old.child) walk(fiber.child)
		}
	}

	walk(root.child)

	return count
}

/** The Motion elements that rendered in the last commit of the root in `container`. */
export function motionRenders(container: HTMLElement): number {
	return countRenders(container, isMotionElement)
}

/**
 * The renders of the components called `name` in the last commit of the root
 * in `container`. A `memo` or a `forwardRef` component counts by the name of
 * the function inside it.
 */
export function componentRenders(container: HTMLElement, name: string): number {
	return countRenders(container, (fiber) => componentName(fiber) === name)
}
