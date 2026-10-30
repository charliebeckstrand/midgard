import { userEvent } from 'vitest/browser'

/** A property of a computed style that holds a string, such as `color` or `boxShadow`. */
type StyleProperty = {
	[K in keyof CSSStyleDeclaration]: CSSStyleDeclaration[K] extends string ? K : never
}[keyof CSSStyleDeclaration] &
	string

/**
 * Reads a computed property of `element`, moves the pointer over `target`, and reads the property
 * again.
 *
 * @param element - The element to read.
 * @param property - The property to read.
 * @param target - The element to hover. It is `element` by default.
 * @returns The value before the hover and the value after it.
 */
export async function acrossHover(
	element: Element,
	property: StyleProperty,
	target: Element = element,
): Promise<{ before: string; after: string }> {
	const before = getComputedStyle(element)[property]

	await userEvent.hover(target)

	return { before, after: getComputedStyle(element)[property] }
}
