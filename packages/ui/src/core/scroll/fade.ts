/**
 * The `scroll-fade-inline` utility: the edge fade of a horizontal scroll
 * container. `ui/tailwind.css` loads this plugin with `@plugin`.
 *
 * A mask fades the scrolled content itself, so the fade needs no solid color
 * behind the container. The width of the fade at each edge is a custom
 * property, `--scroll-fade-start` at the start of the reading direction and
 * `--scroll-fade-end` at the end.
 *
 * Scroll-driven animations draw the fade, and no script runs. Thus the first
 * paint, also the paint of the server markup, shows the final fade. The scroll
 * position drives the two widths in each frame. The fade at an edge grows over
 * the first 1.5rem of scroll away from that edge. It shrinks over the last
 * 1.5rem of scroll toward it, and it is gone when the content reaches the
 * edge.
 *
 * A third animation sets the mask image. When the content fits, the scroll
 * timeline is inactive, so no animation applies and the box has no mask. A
 * mask makes the browser paint the box apart from the page, so a box that fits,
 * such as a short table, paints as before.
 *
 * The mask image has a full fade at each end. The mask extends past each side
 * by the part of that fade that does not show. At a width of zero, the full
 * fade is outside the box. The edges are logical, and the sides are physical, so
 * a right-to-left container swaps the two widths.
 *
 * A browser without scroll-driven animations shows no fade. A fade that comes
 * from script state arrives after the first paint, so the reader sees it
 * appear.
 */

import type { PluginCreator } from 'tailwindcss/plugin'

/** The width of the fade at an edge with content behind it. */
const WIDTH = '1.5rem'

/**
 * The mask image: one gradient with a full fade at each end. The gradient
 * holds no `var()`, because a keyframe resolves a `var()` once, and the widths
 * change in each frame.
 */
const MASK = `linear-gradient(to right, transparent, #000 ${WIDTH}, #000 calc(100% - ${WIDTH}), transparent)`

/**
 * The size and the position of the mask for the fade widths at the left and
 * the right. The mask extends past each side by the part of the full fade that
 * does not show.
 */
function maskBox(left: string, right: string) {
	return {
		'mask-size': `calc(100% + 2 * ${WIDTH} - var(${left}) - var(${right})) 100%`,
		'mask-position': `calc(var(${left}) - ${WIDTH}) 0`,
	}
}

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
		// The image of the mask is the same at each point of the scroll. The size
		// and the position of the mask read the two widths.
		'@keyframes scroll-fade-mask': {
			'from, to': { 'mask-image': MASK },
		},
	})

	addUtilities({
		'.scroll-fade-inline': {
			'mask-repeat': 'no-repeat',
			...maskBox('--scroll-fade-start', '--scroll-fade-end'),
			[RTL]: maskBox('--scroll-fade-end', '--scroll-fade-start'),
			// Longhands, because Lightning CSS expands the `animation` shorthand
			// with a duration of `0s`. A scroll timeline needs `auto`, the length of
			// its range (https://github.com/parcel-bundler/lightningcss/issues/1012).
			[SCROLL_TIMELINE]: {
				'animation-name': 'scroll-fade-start, scroll-fade-end, scroll-fade-mask',
				'animation-duration': 'auto',
				'animation-timing-function': 'linear',
				'animation-fill-mode': 'both',
				'animation-timeline': 'scroll(self inline)',
				'animation-range': `0 ${WIDTH}, calc(100% - ${WIDTH}) 100%, normal`,
			},
		},
	})
}
