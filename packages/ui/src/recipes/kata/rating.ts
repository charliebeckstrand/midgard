/**
 * Rating kata: the star row that stands for a score. One axis: `color`, the
 * hue a filled star takes. The glyphs and the gap take the step of the nearest
 * density scope, so a rating inside a `<Field>` scales with the controls
 * beside it.
 *
 * The chromatic hues ride the `iro.marker` ramp, not the text ramp, and zinc
 * takes a local pair. A star is a glyph and not a word, so it answers the
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
import { defineRecipe, mode, type VariantProps } from '../../core/recipe'
import { hannou, iro, kokkaku, narabi, sen, ugoki } from '../kiso'
import { control } from '../kiso/control'
import { dan } from '../kiso/dan'

const { cursor, disabled } = hannou
const { css } = ugoki
const { marker } = iro
const { flex } = narabi
const { focus } = sen

/**
 * Filled-star hue. The `current` inherits the surrounding text color, for a
 * rating that takes the ink of the row it sits in. Red, amber, green, and blue
 * resolve to the `marker` shade (600 light / 500 dark), which clears the
 * graphical 3:1 floor on the page surface. Zinc takes a local 600 / 400 pair.
 */
const color = {
	current: 'text-current',
	zinc: mode('text-zinc-600', 'dark:text-zinc-400'),
	red: marker.red,
	amber: marker.amber,
	green: marker.green,
	blue: marker.blue,
}

/**
 * One star's box: the position the clipped fill is measured against. It carries
 * the cursor and the focus ring for the interactive form, where the box is a
 * `<label>` over its own native radio.
 */
const star = defineRecipe({
	base: ['relative', flex.inline, 'shrink-0', focus.outline],
	interactive: {
		true: [...cursor],
		false: '',
	},
	defaults: { interactive: false },
})

/**
 * One half of a star at a half step: the `<label>` over the radio for that
 * score. The halves sit on the inline axis, so they mirror in a right-to-left
 * row as the fill does.
 */
const half = defineRecipe({
	base: 'absolute inset-y-0 w-1/2',
	side: {
		start: 'start-0',
		end: 'end-0',
	},
	defaults: { side: 'start' },
})

/**
 * The empty glyph under every star, in the neutral the unfilled part reads as.
 * In an invalid row, the outline of each empty star turns red, as the box of an
 * invalid checkbox does.
 */
const track = [
	...mode('text-zinc-300', 'dark:text-zinc-600'),
	...mode('group-data-invalid/rating:text-red-600', 'dark:group-data-invalid/rating:text-red-500'),
]

export const k = defineRecipe(
	{
		base: [flex.inline, 'w-fit', ...disabled, kokkaku.rating.gap],
		color,
		defaults: { color: 'amber' },
		skeleton: kokkaku.rating,
	},
	{
		/** The group that the track reads the invalid state of the row from. The skeleton does not take it. */
		group: 'group/rating',
		star,
		half,
		track,
		/** The glyph size at each step. The track and the fill share it, so the two stack exactly. */
		glyph: kokkaku.rating.star,
		/**
		 * The window a partly-filled star draws its fill inside. Absolute over the
		 * track glyph and clipping at its own width, which the component sets from
		 * the value. The glyph within keeps its full size, so the star is cut and
		 * never squeezed. The window starts at the inline start, so a part star
		 * fills from the right in a right-to-left row.
		 */
		clip: [
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
		clearing: 'opacity-40',
		/** Visually-hidden native radio, overlaying its own star. */
		input: control.check.hidden,
	},
)

/** Recipe variant props for {@link Rating}: the `color` axis of its kata, for consumers composing custom slots. */
export type RatingVariants = Omit<VariantProps<typeof k>, 'color'> & {
	/** The color of the filled stars. @defaultValue 'amber' */
	color?: VariantProps<typeof k>['color']
}

/** The size scale of {@link Rating}: the steps of its stars and gap. */
export const scale = defineScale(dan.size.check.box, dan.gap.rating)
