import { getScroller } from '../../../utilities/get-scroller'

// The names of the elements that an event reaches, and the mark of the
// elements of the tools themselves.

/**
 * The attribute of the elements of the tools: the header button and the
 * pinned panel. The sources skip the events in them, so the store does not
 * record its own use.
 *
 * @internal
 */
export const TOOL_ATTRIBUTE = 'data-events-tool'

/** Whether an event target is in an element of the tools. @internal */
export function isOwn(target: unknown): boolean {
	return target instanceof Element && target.closest(`[${TOOL_ATTRIBUTE}]`) !== null
}

/**
 * The text that the events write in place of a secret: the value of a
 * password field, and each character that a key types into it. It has a
 * fixed length, so it does not tell the length of the secret.
 *
 * @internal
 */
export const MASK = '***'

/**
 * The password fields: each input of type `password`, and each
 * `PasswordInput`, which keeps its slot while it shows the password as text.
 */
const SECRET = 'input[type="password"], input[data-slot="password-input"]'

/** Whether an event target is a password field, whose value the events do not write. @internal */
export function isSecret(target: unknown): boolean {
	return target instanceof HTMLInputElement && target.matches(SECRET)
}

/**
 * A short name of an event target: the tag, the anchor, and the value of an
 * input. The value of a password field is {@link MASK}.
 *
 * @internal
 */
export function describeTarget(target: unknown): string {
	if (!(target instanceof Element) || target === document.documentElement) return 'page'

	const slot = target.getAttribute('data-slot')

	const value =
		target instanceof HTMLInputElement && target.value
			? `=${isSecret(target) ? MASK : target.value}`
			: ''

	return `${target.tagName.toLowerCase()}${slot ? `[${slot}]` : ''}${value}`
}

/**
 * Where an element is: its name and the name of each ancestor with a slot,
 * its box, and the scroll position of its scroll container.
 *
 * @internal
 */
export function describePlace(el: Element): string {
	const names = [describeTarget(el)]

	for (let ancestor = el.parentElement; ancestor; ancestor = ancestor.parentElement)
		if (ancestor.hasAttribute('data-slot')) names.unshift(describeTarget(ancestor))

	const { x, y, width, height } = el.getBoundingClientRect()

	const box = [x, y, width, height].map(Math.round)

	const scroller = getScroller(el.parentElement, { inline: true, overflowing: true })

	const scroll = scroller
		? `, in ${describeTarget(scroller)} scrolled ${Math.round(scroller.scrollLeft)},${Math.round(scroller.scrollTop)}`
		: ''

	return `${names.join(' > ')} at ${box[0]},${box[1]} ${box[2]}×${box[3]}${scroll}`
}
