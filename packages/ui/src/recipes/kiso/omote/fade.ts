/**
 * Omote fade: the edge fade of a scroll container. A mask fades the scrolled
 * content itself, so the fade needs no solid color behind the container.
 *
 * `inline` fades the horizontal edge that has more content behind it. It keys
 * off the `data-overflow-start` / `data-overflow-end` attributes that
 * `useScrollOverflow({ axis: 'horizontal' })` stamps. The attributes are
 * logical, and a mask direction is physical, so each edge takes one class for
 * each reading direction. Tailwind intersects the two edge masks when both
 * edges show.
 *
 * Layer: kiso · Concern: scroll edge fade
 */

export const fade = {
	inline: [
		'ltr:data-overflow-start:mask-l-from-[calc(100%-1.5rem)]',
		'ltr:data-overflow-end:mask-r-from-[calc(100%-1.5rem)]',
		'rtl:data-overflow-start:mask-r-from-[calc(100%-1.5rem)]',
		'rtl:data-overflow-end:mask-l-from-[calc(100%-1.5rem)]',
	],
} as const
