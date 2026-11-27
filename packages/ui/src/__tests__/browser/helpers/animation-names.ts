/**
 * The names of the CSS animations that run on `element`, not on its
 * descendants. A transition and a Web Animation that a script starts have no
 * name, so the list leaves them out.
 *
 * @param element - The element to read.
 * @returns The `animationName` of each CSS animation of the element.
 */
export function animationNames(element: Element): string[] {
	return element
		.getAnimations()
		.filter((animation): animation is CSSAnimation => animation instanceof CSSAnimation)
		.map((animation) => animation.animationName)
}
