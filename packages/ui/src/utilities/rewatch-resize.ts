import { sameElements } from './same-elements'

/**
 * Moves the observation of `observer` from `watched` to `next`, when the two
 * lists differ.
 *
 * @remarks Use it in the callback of an observer that watches elements that a
 * scan finds, where React can mount those elements again. An observed element
 * that leaves the document gets a size of zero, so the observer runs. The
 * callback then scans again, and the elements of the new mount take the place
 * of the elements that left. Each new observation reports its size one time,
 * so the callback runs once more after a move.
 *
 * An empty `next` keeps `watched`: the scan found no element, for example
 * while a row is mid change, and the owner observes again when it changes.
 *
 * @param observer - The observer of the elements.
 * @param watched - The elements that `observer` watches now.
 * @param next - The elements of the new scan.
 * @returns The elements that `observer` watches after the call.
 * @internal
 */
export function rewatchResize<E extends Element>(
	observer: ResizeObserver,
	watched: readonly E[],
	next: readonly E[],
): readonly E[] {
	if (next.length === 0 || sameElements(watched, next)) return watched

	for (const element of watched) observer.unobserve(element)

	for (const element of next) observer.observe(element)

	return next
}
