/**
 * Popover kata: the unit of `<Popover>` and of the PopoverPanel primitive,
 * which both read it. The root slot `base` is the floating panel, and the
 * `surface` axis gives it the opaque popover fill or the glass chrome. The
 * `trigger` keeps the anchor inline with the text or the icons around it. The
 * `portal` rides the `float` rung of the stacking order, which clears every
 * overlay rung, because a popover opens from inside a modal panel too.
 * `content` and `body` are the outer element of `<PopoverContent>` and the box
 * inside it.
 */
import { defineScale } from '../../core/density'
import { defineKata } from '../../core/recipe'
import { dan, hannou, iro, kasane, omote, sen, sou, ugoki } from '../kiso'

const { cursor } = hannou
const { rounded } = kasane
const { ring } = sen

export const k = defineKata(
	{
		base: [
			'z-50',
			'absolute isolate',
			'min-w-full',
			'p-1 space-y-0.5',
			'overflow-y-auto overscroll-contain',
			rounded.lg,
			'outline outline-transparent focus:outline-hidden',
			...cursor,
			'select-none',
		],
		/**
		 * The surface of the panel. `glass` is the other half of the marker that
		 * `hannou.tint.glass` keys on: the panel also sets `data-glass`. See
		 * `recipes/kiso/hannou/glass-item.ts`.
		 */
		surface: {
			flat: omote.popover,
			glass: ['group/glass', omote.glass, ring.default],
		},
		slots: {
			trigger: 'inline-flex',
			portal: sou.float,
			/** The body text inside the panel. The glass content draws no fill of its own. */
			content: {
				base: ['text-pretty', iro.text.default],
				surface: { flat: '', glass: omote.glass },
			},
			/** The box inside the content, padded at each density step: the `lg` stop of the padding scale. */
			body: dan.space.popover,
		},
		defaults: { surface: 'flat' },
	},
	{ motion: ugoki.popover },
)

/** The size scale of {@link PopoverContent}: the steps of its padding. */
export const scale = defineScale(dan.space.popover)
