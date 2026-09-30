/**
 * A render counter for the browser benches. It installs a minimal React
 * DevTools hook, so it must load before `react-dom`. Import it first, as a
 * side-effect import, in each bench file that counts.
 *
 * The production build of `react-dom` reports each commit to the hook. The
 * counter walks the committed tree and counts each component that did work in
 * the commit, by the name of its function. It visits a subtree only when its
 * child list changed, as React DevTools does, so a subtree that bailed out
 * counts nothing. A component that runs and then bails out, because its props,
 * its state, and its context did not change, also counts nothing.
 */

/** The fiber fields that the counter reads. */
type Fiber = {
	type: unknown
	flags: number
	child: Fiber | null
	sibling: Fiber | null
	alternate: Fiber | null
}

/** The flag that React sets on a fiber whose component ran in the render. */
const PERFORMED_WORK = 1

/** The renders of each component name since the last {@link resetRenders}. */
const renders = new Map<string, number>()

/** The commits since the last {@link resetRenders}. */
let commits = 0

/** The name of the component of `fiber`, or `undefined` for a host or an internal fiber. */
function nameOf(fiber: Fiber): string | undefined {
	const { type } = fiber

	if (typeof type === 'function') return type.name || undefined

	// A `memo` or a `forwardRef` wraps the component function.
	if (typeof type === 'object' && type !== null) {
		const inner =
			(type as { type?: unknown; render?: unknown }).type ?? (type as { render?: unknown }).render

		if (typeof inner === 'function') return inner.name || undefined
	}

	return undefined
}

/** Counts each component in `first` and its siblings that ran in the commit. */
function walk(first: Fiber | null) {
	for (let fiber = first; fiber; fiber = fiber.sibling) {
		const previous = fiber.alternate

		const name = nameOf(fiber)

		if (name && (previous === null || (fiber.flags & PERFORMED_WORK) !== 0)) {
			renders.set(name, (renders.get(name) ?? 0) + 1)
		}

		if (previous === null || fiber.child !== previous.child) walk(fiber.child)
	}
}

// React reads the hook once, when `react-dom` loads.
Object.assign(globalThis, {
	__REACT_DEVTOOLS_GLOBAL_HOOK__: {
		supportsFiber: true,
		isDisabled: false,
		renderers: new Map(),
		inject: () => 1,
		onCommitFiberRoot: (_id: number, root: { current: Fiber }) => {
			commits += 1

			walk(root.current.child)
		},
		onCommitFiberUnmount: () => {},
		onPostCommitFiberRoot: () => {},
		checkDCE: () => {},
	},
})

/** Clears the counts. */
export function resetRenders() {
	renders.clear()

	commits = 0
}

/** The commits and the renders of each named component since the last {@link resetRenders}. */
export function readRenders(
	names: readonly string[],
): { commits: number } & Record<string, number> {
	return Object.assign(
		{ commits },
		Object.fromEntries(names.map((name) => [name, renders.get(name) ?? 0])),
	)
}
