/**
 * The join stamp `useGroup` clones onto each child of a `<Group>`: which
 * position the child holds in the run, and the run's axis. The `tsunagi`
 * selectors read both off the child, so every control that can sit in a group
 * declares this rather than re-spelling the pair.
 *
 * Plumbing, not consumer API. A consumer never writes these; `<Group>` does.
 * It lives with the cross-layer types because a primitive reads it too, and no
 * barrel re-exports it.
 *
 * @internal
 */
export type GroupStampProps = {
	'data-group'?: string
	'data-group-orientation'?: string
}
