/**
 * Sheet kata: object-literal surface for the `<Sheet>` edge drawer, built by
 * bridging the shared `panel` recipe. The `panel` sub-recipe axes on `side`,
 * `width`, and `surface`. The `backdrop` mirrors the glass/flat surface. The
 * bridged `title` / `description` / `body` / `footer` slots, the `handle` drag
 * grip, and `motion` complete the dialog chrome.
 */
import { defineRecipe, type VariantProps } from '../../core/recipe'
import { bridge } from '../katakana'
import { hannou, narabi, omote, shaku, ugoki } from '../kiso'
import { panel } from '../kiso/panel'

const { flex, slide } = narabi
const { glass, backdrop } = omote

/**
 * The widest a sheet is drawn at: the screen, less the inset it floats on.
 *
 * Stated once because it is the complement of the `sm:*-4` the sides set. Move
 * the panel's float and this has to move with it, and two copies would leave one
 * behind. `sheetCeiling` measures the same gap off the element for the gesture.
 */
const CAP = 'sm:max-w-[calc(100%-2rem)]'

/** The named `width` steps, each empty on the axis. The compounds give each step its cap. */
const STEPS = Object.fromEntries(Object.keys(shaku.panel).map((width) => [width, []])) as Record<
	keyof typeof shaku.panel,
	never[]
>

/**
 * Each named step, as its cap on the two sides that a width docks across.
 *
 * A `top` or `bottom` sheet gets no cap. Its span is the screen, and a cap
 * would pull it into a corner.
 */
const DOCKED_STEPS = Object.entries(shaku.panel).flatMap(([width, cap]) => [
	{ side: 'right', width, class: cap },
	{ side: 'left', width, class: cap },
])

export const k = {
	...bridge.panel(panel, {
		panel: defineRecipe({
			base: [
				...panel.surface.chrome.flat(),
				panel.layout.base,
				'absolute overflow-y-auto',
				'sm:rounded-xl',
			],
			side: {
				right: [
					'inset-y-0 right-0 w-full',
					'max-sm:rounded-r-none max-sm:pb-[env(safe-area-inset-bottom)]',
					'sm:top-4 sm:right-4 sm:bottom-4',
				],
				left: [
					'inset-y-0 left-0 w-full',
					'max-sm:rounded-l-none max-sm:pb-[env(safe-area-inset-bottom)]',
					'sm:top-4 sm:left-4 sm:bottom-4',
				],
				// Each side keeps its content clear of the screen edge it sits on, in a
				// page with `viewport-fit=cover`. Elsewhere the inset is zero.
				top: [slide.top, 'pt-[env(safe-area-inset-top)]'],
				bottom: [slide.bottom, 'pb-[env(safe-area-inset-bottom)]'],
			},
			// The named steps are max-widths and nothing more, so they stay the shared
			// scale. `fit` is a different kind of answer — the panel takes the width of
			// what it holds — so it is stated here rather than pushed into a scale
			// Dialog also reads.
			//
			// Every step is empty on the axis, because a width only means something on
			// the sides it is docked across. The compounds below give each step to
			// `right` and `left`. A `top` or `bottom` sheet spans the screen, and a cap
			// or a shrink-wrap would pull a full-width panel into a corner.
			width: { ...STEPS, fit: [] },
			surface: {
				glass: [...glass],
				flat: [...panel.surface.bg],
			},
			compound: [
				...DOCKED_STEPS,
				{ side: 'right', width: 'full', class: `sm:left-4 ${CAP}` },
				{ side: 'left', width: 'full', class: `sm:right-4 ${CAP}` },
				// Below `sm` the side's own `w-full` still wins, so a phone keeps a
				// flush, full-width sheet: there is no room there for a panel to be
				// narrower than the screen.
				{ side: 'right', width: 'fit', class: `sm:w-max ${CAP}` },
				{ side: 'left', width: 'fit', class: `sm:w-max ${CAP}` },
			],
			defaults: { side: 'right', width: 'md', surface: 'flat' },
		}),
		backdrop: bridge.backdrop(backdrop),
		title: { extra: 'px-6 pt-6' },
		description: { extra: 'px-6' },
		footer: { extra: 'px-6 pb-6' },
		body: { extra: [flex.fill, 'overflow-y-auto px-6 first:pt-6'] },
	}),
	/**
	 * The drag handle: a grab area tall enough to aim at, and the bar inside it
	 * the reader actually sees.
	 *
	 * It rides the panel's inline edge rather than sitting in the flow, because a
	 * sheet resizes across its own scrolling body. Laid out in the column with
	 * the slots, the grip would scroll away from the edge it moves. On a sheet
	 * docked to a side, the area is the full height, so the reach is the panel's
	 * rather than the bar's. A sheet docked across gets a strip on its edge, not
	 * a cover over the whole panel.
	 * `hannou.grab.default` carries the rest, including the `touch-none` that
	 * makes the gesture work at all under a finger.
	 *
	 * `side` puts it on the edge that faces the screen: a right-hand sheet grows
	 * leftward, so its grip is on the left.
	 */
	handle: {
		area: [
			flex.col,
			// The same reach the drawer's grip has, turned on its side: `px-3` around
			// a `w-1.5` bar is the `py-3` around its `h-1.5` one, so both panels are
			// grabbed by a strip of the same thickness.
			'absolute z-10 px-3 items-center justify-center',
			...hannou.grab.default,
			// The stroke goes on the bar, not here — see the archetype's grip. This
			// suppresses the browser's own, which would draw around the whole reach.
			'outline-hidden',
			panel.grip.GROUP,
		],
		side: {
			// The full-height reach belongs to the two side arms only. In the base, it
			// survives the `bottom-0` of a cross arm, and the strip covers the panel.
			right: 'inset-y-0 left-0',
			left: 'inset-y-0 right-0',
			top: 'inset-x-0 bottom-0 py-3 w-full',
			bottom: 'inset-x-0 top-0 py-3 w-full',
		},
		/** Keyed by the separator's own line: a sheet docked to a side is grabbed the other way from one docked across. */
		bar: panel.grip.bar,
	},
	motion: ugoki.panel,
}

/** Recipe variant props for the {@link Sheet} panel — its styling axes (`side`, `width`, `surface`), for consumers composing custom slots. */
export type SheetPanelVariants = VariantProps<typeof k.panel>
