'use client'

export type ScrollIntoContainerOptions = {
	behavior?: ScrollBehavior
	block?: 'start' | 'center' | 'end' | 'nearest'
}

function scrollIntoContainer(node: HTMLElement | null, options: ScrollIntoContainerOptions = {}) {
	if (!node) return

	const { behavior = 'auto', block = 'nearest' } = options

	let scroller: HTMLElement | null = node.parentElement

	while (scroller) {
		const { overflowY } = getComputedStyle(scroller)

		if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') break

		scroller = scroller.parentElement
	}

	if (!scroller) return

	const nodeRect = node.getBoundingClientRect()

	const scrollerRect = scroller.getBoundingClientRect()

	const offset = nodeRect.top - scrollerRect.top

	const slack = scroller.clientHeight - nodeRect.height

	let top: number

	switch (block) {
		case 'start':
			top = scroller.scrollTop + offset
			break
		case 'center':
			top = scroller.scrollTop + offset - slack / 2
			break
		case 'end':
			top = scroller.scrollTop + offset - slack
			break
		default:
			if (offset < 0) top = scroller.scrollTop + offset
			else if (offset + nodeRect.height > scroller.clientHeight)
				top = scroller.scrollTop + offset - slack
			else return
	}

	scroller.scrollTo({ top, behavior })
}

/**
 * Returns a function that scrolls a node into view within its nearest
 * scrollable ancestor, without affecting any outer scroll containers.
 * Mirrors the `block`/`behavior` options of native `scrollIntoView`.
 */
export function useScrollIntoContainer() {
	return scrollIntoContainer
}
