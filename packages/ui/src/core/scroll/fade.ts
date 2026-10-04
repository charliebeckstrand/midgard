/**
 * The `scroll-fade-inline` utility: the edge fade of a horizontal scroll
 * container. `ui/tailwind.css` loads this plugin with `@plugin`.
 *
 * A mask fades the scrolled content itself, so the fade needs no solid color
 * behind the container. One gradient fades both edges. The width of the fade at
 * each edge is a custom property, `--scroll-fade-start` at the start of the
 * reading direction and `--scroll-fade-end` at the end.
 *
 * Where the browser supports scroll-driven animations, the scroll position
 * drives the two widths directly. The fade at an edge grows over the first
 * 1.5rem of scroll away from that edge, and it shrinks over the last 1.5rem of
 * scroll toward it. Thus the fade follows the scroll in each frame, and it is
 * gone when the content reaches the edge. No script runs on scroll. When the
 * content fits, the scroll timeline is inactive, and neither edge fades.
 *
 * Elsewhere, the widths key off the `data-overflow-start` / `data-overflow-end`
 * attributes that `useScrollOverflow({ axis: 'horizontal' })` stamps. Each
 * edge then shows a full fade or no fade.
 *
 * In each browser, the mask applies only while one of the attributes is
 * present. An attribute drops when the content reaches its edge, and the
 * scroll-driven width at that edge is then already zero.
 *
 * The edges are logical, and a gradient direction is physical, so a
 * right-to-left container turns the gradient.
 */

import type { PluginCreator } from 'tailwindcss/plugin'

/** The width of the fade at an edge with content behind it. */
const WIDTH = '1.5rem'

/** The Tailwind `rtl` variant: the element is in a right-to-left context. */
const RTL = '&:where(:dir(rtl), [dir="rtl"], [dir="rtl"] *)'

/** The test for scroll-driven animations. */
const SCROLL_TIMELINE = '@supports (animation-timeline: scroll())'

/**
 * The plugin handler. Tailwind reads a named `handler` export as a plugin, so
 * the module needs no default export.
 */
export const handler: PluginCreator = ({ addBase, addUtilities }) => {
	// A registered length interpolates in an animation. An unregistered custom
	// property flips at the midpoint.
	addBase({
		'@property --scroll-fade-start': {
			syntax: "'<length>'",
			inherits: 'false',
			'initial-value': '0px',
		},
		'@property --scroll-fade-end': {
			syntax: "'<length>'",
			inherits: 'false',
			'initial-value': '0px',
		},
		'@keyframes scroll-fade-start': {
			from: { '--scroll-fade-start': '0px' },
			to: { '--scroll-fade-start': WIDTH },
		},
		'@keyframes scroll-fade-end': {
			from: { '--scroll-fade-end': WIDTH },
			to: { '--scroll-fade-end': '0px' },
		},
	})

	addUtilities({
		'.scroll-fade-inline': {
			'--scroll-fade-to': 'right',
			// A mask makes the browser paint the box apart from the page. The box
			// takes it only while it overflows, so a box that fits, such as a short
			// table, paints as before.
			'&:is([data-overflow-start], [data-overflow-end])': {
				'mask-image':
					'linear-gradient(to var(--scroll-fade-to), transparent, #000 var(--scroll-fade-start), #000 calc(100% - var(--scroll-fade-end)), transparent)',
			},
			[RTL]: { '--scroll-fade-to': 'left' },
			// Longhands, because Lightning CSS expands the `animation` shorthand
			// with a duration of `0s`. A scroll timeline needs `auto`, the length of
			// its range.
			[SCROLL_TIMELINE]: {
				'animation-name': 'scroll-fade-start, scroll-fade-end',
				'animation-duration': 'auto',
				'animation-timing-function': 'linear',
				'animation-fill-mode': 'both',
				'animation-timeline': 'scroll(self inline)',
				'animation-range': `0 ${WIDTH}, calc(100% - ${WIDTH}) 100%`,
			},
			'@supports not (animation-timeline: scroll())': {
				'&[data-overflow-start]': { '--scroll-fade-start': WIDTH },
				'&[data-overflow-end]': { '--scroll-fade-end': WIDTH },
			},
		},
	})
}
