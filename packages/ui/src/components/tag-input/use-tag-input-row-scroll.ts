'use client'

import { useComposedRefs } from 'motion/react'
import { type RefCallback, useEffect, useRef } from 'react'
import { useScrollRegion } from '../../hooks'
import { isRtl } from '../../hooks/a11y/logical-arrow'

/**
 * The scroll of the tag row of a TagInput while the row stays on one line.
 *
 * While the row overflows, it is a tab stop ({@link useScrollRegion}), so a
 * keyboard can scroll past a chip with no remove button. It takes no region
 * role, because it keeps its list role. A new tag goes at the end of the row,
 * next to the text input, so the row scrolls to its end to show it. Only a
 * growth of the list scrolls. A removal or the first render leaves the scroll
 * where it is.
 *
 * @param count - The number of tags.
 * @param wrap - Whether the row wraps. A wrapped row does not scroll, and the
 * returned ref is then `undefined`.
 * @returns A callback ref for the tag row.
 * @internal
 */
export function useTagInputRowScroll(
	count: number,
	wrap: boolean,
): RefCallback<HTMLElement> | undefined {
	const listRef = useRef<HTMLElement>(null)

	const regionRef = useScrollRegion()

	const setRef = useComposedRefs(listRef, regionRef)

	const previous = useRef(count)

	useEffect(() => {
		const list = listRef.current

		const grew = count > previous.current

		previous.current = count

		if (!grew || wrap || !list) return

		list.scrollLeft = isRtl(list) ? -list.scrollWidth : list.scrollWidth
	}, [count, wrap])

	return wrap ? undefined : setRef
}
