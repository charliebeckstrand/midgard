/**
 * Rating kata: the star row that stands for a score. One axis: `color`, the
 * hue a filled star takes. The glyphs and the gap take the step of the nearest
 * density scope, so a rating inside a `<Field>` scales with the controls
 * beside it.
 *
 * The hues ride the `zu.marker` ramp, not the text ramp. A star is a glyph and not a word, so it answers the
 * non-text 3:1 floor (WCAG 1.4.11). The empty
 * track keeps a neutral of its own. A track that took the hue at a lower opacity
 * would read as a part-filled star.
 *
 * A star draws twice: a track glyph, and a fill glyph clipped over it. One icon
 * therefore covers the whole range a value can land in. The `clip` slot is the
 * window the fill draws inside; the component sets its width from the value.
 * The display form draws a whole or an empty star as one glyph: the fill glyph
 * alone, or the track glyph alone.
 */

import { defineScale } from '../../core/density'
import { defineKata, mode, type VariantProps } from '../../core/recipe'
import { dan, hannou, kokkaku, narabi, sen, ugoki, zu } from '../kiso'
import { hidden } from '../kumi/check'

const { cursor, disabled } = hannou
const { css } = ugoki
const { marker } = zu
const { flex, touch } = narabi
const { focus } = sen

/**
 * Filled-star hue. The `current` inherits the surrounding text color, for a
 * rating that takes the ink of the row it sits in. Each color resolves to the
 * `marker` shade, which clears the graphical 3:1 floor on the page surface.
 */
const color = { current: 'text-current', ...marker }

/**
 * The focus ring of a star. It goes around the glyph, not around the wider cell
 * of the hit area. At a half step, the star holds the two radios, so
 * `focus.outline` (`has-focus-visible`) draws it. At a whole step, the radio
 * comes before the star in the cell, so the star reads the radio as a `peer`.
 * The `peer` ring does the swap of `focus.outline` too: inside a
 * `[data-scroll-region]`, where `overflow-y-auto` clips an outset outline, it
 * is a 2 px border.
 */
const starFocus = [
	focus.outline,
	'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2',
	...mode('peer-focus-visible:outline-blue-600', 'dark:peer-focus-visible:outline-blue-500'),
	'[[data-scroll-region]_&]:peer-focus-visible:outline-none [[data-scroll-region]_&]:peer-focus-visible:border-2',
	...mode(
		'[[data-scroll-region]_&]:peer-focus-visible:border-blue-600',
		'dark:[[data-scroll-region]_&]:peer-focus-visible:border-blue-500',
	),
]

/**
 * One star's box: the position the clipped fill is measured against. It has
 * the size of the glyph.
 */
const star = ['relative', flex.inline, 'shrink-0', starFocus]

/**
 * The cell of one star in the interactive form, which carries the cursor. The
 * star in it carries the focus ring (`starFocus`). Each cell is at least the floor of `TouchTarget` wide: 24 px
 * on a fine pointer and 44 px on a coarse pointer (WCAG 2.5.8). The star is in
 * the middle of its cell.
 *
 * At a whole step, the cell is the `<label>` over the radio of the star, and
 * the gap of the rating is between two cells. The row writes that gap as the
 * touch gap (`row`), so each hit area meets the next and does not overlap it.
 *
 * At a half step, the cell holds the two halves of the star (`half`), so it is
 * at least 48 px wide on each pointer. The halves touch, so each hit area keeps
 * to its half on the inline axis. On a coarse pointer a half is thus 24 px wide
 * and not 44 px: a cell of 88 px would make a row of five stars too wide for a
 * phone.
 */
const cell = {
	base: [flex.inline, 'justify-center shrink-0', ...cursor],
	step: {
		whole: 'relative min-w-6 pointer-coarse:min-w-11',
		half: ['min-w-12', touch.flush.x],
	},
}

/**
 * One half of a star at a half step: the `<label>` over the radio for that
 * score. Each half is 24 px wide and goes from the center of the star to one
 * side, so the two halves fill the cell. The halves sit on the inline axis, so
 * they mirror in a right-to-left row as the fill does.
 */
const half = {
	base: 'absolute inset-y-0 w-6',
	side: {
		start: 'end-1/2',
		end: 'start-1/2',
	},
}

/**
 * The row of the interactive form: the gap of the rating as the touch gap, so
 * that a touch gap of a container does not reach the stars.
 */
const row = dan.gap.touch.rating

/**
 * The empty glyph under every star, in the neutral the unfilled part reads as.
 * The empty star shows the length of the scale, so it keeps a 3:1 contrast
 * against the page in each mode (WCAG 1.4.11). The shape of the glyph, an
 * outline and not a solid star, tells it from a filled star. In an invalid row, the outline of each empty star turns red, as the box of an
 * invalid checkbox does.
 */
const track = [
	...mode('text-zinc-500', 'dark:text-zinc-500'),
	...mode('group-data-invalid/rating:text-red-600', 'dark:group-data-invalid/rating:text-red-500'),
]

export const k = defineKata(
	{
		base: [flex.inline, 'w-fit', ...disabled.base, dan.gap.rating],
		color,
		slots: {
			/** The group that the track reads the invalid state of the row from. The skeleton does not take it. */
			group: 'group/rating',
			row,
			star,
			cell,
			half,
			track,
			/** The glyph size at each step. The track and the fill share it, so the two stack exactly. */
			glyph: dan.size.check.box,
			/**
			 * The window a partly-filled star draws its fill inside. Absolute over the
			 * track glyph and clipping at its own width, which the component sets from
			 * the value. The glyph within keeps its full size, so the star is cut and
			 * never squeezed. The window starts at the inline start, so a part star
			 * fills from the right in a right-to-left row.
			 */
			clip: {
				base: [
					'absolute inset-y-0 start-0 overflow-hidden pointer-events-none',
					// For the clearing recede below, which is a hover answer and reads as a
					// jump without it.
					css.opacity,
				],
				/**
				 * The fill's treatment while the pointer rests on the star that would clear
				 * the score. Every other star previews what a click would set, and this one
				 * previews what a click would take away. Without the recede it previews
				 * nothing at all, because the row it would leave behind is the row already
				 * drawn. Worst at a score of one, where the pointer is on the only filled
				 * star and no part of the row answers it.
				 */
				clearing: { true: 'opacity-40', false: '' },
			},
			/** Visually-hidden native radio, overlaying its own star. It is the `peer` of the star at a whole step. */
			input: [hidden, 'peer'],
		},
		defaults: { color: 'amber', side: 'start', step: 'whole', clearing: false },
	},
	{ skeleton: kokkaku.rating },
)

/** Recipe variant props for {@link Rating}: the `color` axis of its kata, for consumers composing custom slots. */
export type RatingVariants = {
	/** The color of the filled stars. @defaultValue 'amber' */
	color?: VariantProps<typeof k>['color']
}

/** The size scale of {@link Rating}: the steps of its stars and gap. */
export const scale = defineScale(dan.size.check.box, dan.gap.rating)
