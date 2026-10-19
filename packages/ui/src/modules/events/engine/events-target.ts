import { findScrollableAncestor } from '../../../utilities/find-scrollable-ancestor'

// The names of the elements that an event reaches, and the mark of the
// elements of the tools themselves.

/**
 * The attribute of the elements of the tools: the header button and the
 * pinned panel. The sources skip the events in them, so the store does not
 * record its own use.
 */
export const OWN = 'data-events-tool'

/** Whether an event target is in an element of the tools. */
export function isOwn(target: unknown): boolean {
	return target instanceof Element && target.closest(`[${OWN}]`) !== null
}

/** A short name of an event target: the tag, the anchor, and the value of an input. */
export function describeTarget(target: unknown): string {
	if (!(target instanceof Element) || target === document.documentElement) return 'page'

	const slot = target.getAttribute('data-slot')

	const value = target instanceof HTMLInputElement && target.value ? `=${target.value}` : ''

	return `${target.tagName.toLowerCase()}${slot ? `[${slot}]` : ''}${value}`
}

/**
 * Where an element is: its name and the name of each ancestor with a slot,
 * its box, and the scroll position of its scroll container.
 */
export function placeOf(el: Element): string {
	const names = [describeTarget(el)]

	for (let ancestor = el.parentElement; ancestor; ancestor = ancestor.parentElement)
		if (ancestor.hasAttribute('data-slot')) names.unshift(describeTarget(ancestor))

	const { x, y, width, height } = el.getBoundingClientRect()

	const box = [x, y, width, height].map(Math.round)

	const scroller = findScrollableAncestor(el.parentElement)

	const scroll = scroller
		? `, in ${describeTarget(scroller)} scrolled ${Math.round(scroller.scrollLeft)},${Math.round(scroller.scrollTop)}`
		: ''

	return `${names.join(' > ')} at ${box[0]},${box[1]} ${box[2]}×${box[3]}${scroll}`
}
