import type { ComponentPropsWithoutRef } from 'react'

/** Picks a single key from its argument rather than spreading the whole thing. */
type PickId<T> = { tone: string } & Pick<T, 'id'>

/**
 * Renders a span, taking only a div's `id` through a generic alias — nothing is
 * spread onto an element, so no pass-through should be reported despite the
 * `ComponentPropsWithoutRef<'div'>` argument.
 */
export function Picked({ tone, id }: PickId<ComponentPropsWithoutRef<'div'>>) {
	return <span id={id} data-tone={tone} />
}
