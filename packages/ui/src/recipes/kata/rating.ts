/**
 * Rating kata: the star row that stands for a score. Two axes — `size` (the
 * `sun` density steps, so a rating inside a `<Field>` scales with the controls
 * beside it) and `color` (the hue a filled star takes).
 *
 * The hue rides the `iro.marker` ramp, not the text ramp: a star is a glyph and
 * not a word, so it answers the non-text 3:1 floor (WCAG 1.4.11). The empty
 * track keeps a neutral of its own, because a track that took the hue at a
 * lower opacity would read as a part-filled star.
 *
 * A star draws twice — a track glyph and a fill glyph clipped over it — so one
 * icon covers the whole range a value can land in. The `clip` slot is the
 * window the fill draws inside; the component sets its width from the value.
 */
import { defineRecipe, mode, type VariantProps } from '../../core/recipe'
import { hannou, iro, kokkaku, narabi, sen, ugoki } from '../kiso'
import { control } from '../kiso/control'

const { cursor, disabled } = hannou
const { css } = ugoki
const { marker } = iro
const { flex } = narabi
const { focus } = sen

/**
 * Filled-star hue. `current` inherits the surrounding text colour, for a rating
 * that takes the ink of the row it sits in; the named colours resolve to the
 * `marker` shade (600 light / 500 dark), which clears the graphical 3:1 floor
 * on the page surface.
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

/** The empty glyph under every star, in the neutral the unfilled part reads as. */
const track = mode('text-zinc-300', 'dark:text-zinc-600')

export const k = defineRecipe(
	{
		base: [flex.inline, 'items-center', 'w-fit', ...disabled],
		size: {
			sm: 'gap-0.5',
			md: 'gap-0.5',
			lg: 'gap-1',
		},
		color,
		defaults: { size: 'md', color: 'amber' },
	},
	{
		star,
		track,
		/** Glyph dimension per step; the track and the fill share it, so the two stack exactly. */
		glyph: {
			sm: 'size-4',
			md: 'size-5',
			lg: 'size-6',
		} as const,
		/**
		 * The window a partly-filled star draws its fill inside. Absolute over the
		 * track glyph and clipping at its own width, which the component sets from
		 * the value; the glyph within keeps its full size, so the star is cut and
		 * never squeezed.
		 */
		clip: [
			'absolute inset-y-0 left-0 overflow-hidden pointer-events-none',
			// For the clearing recede below, which is a hover answer and reads as a
			// jump without it.
			css.opacity,
		],
		/**
		 * The fill's treatment while the pointer rests on the star that would clear
		 * the score. Every other star previews what a click would set, and this one
		 * previews what a click would take away — without the recede it previews
		 * nothing at all, because the row it would leave behind is the row already
		 * drawn. Worst at a score of one, where the pointer is on the only filled
		 * star and no part of the row answers it.
		 */
		clearing: 'opacity-40',
		/** Visually-hidden native radio, overlaying its own star. */
		input: control.check.hidden,
		skeleton: kokkaku.rating,
	},
)

/** Recipe variant props for {@link Rating} — the styling axes its kata exposes (`size`, `color`), for consumers composing custom slots. */
export type RatingVariants = VariantProps<typeof k>
