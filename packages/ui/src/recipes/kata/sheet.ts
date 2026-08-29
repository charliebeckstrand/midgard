/**
 * Sheet kata: object-literal surface for the `<Sheet>` edge drawer, built by
 * bridging the shared `panel` recipe. The `panel` sub-recipe axes on `side`,
 * `width`, and `surface`; `backdrop` mirrors the glass/flat surface, and the
 * bridged `title` / `description` / `body` / `footer` slots plus `motion`
 * complete the dialog chrome.
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
 * Stated once because it is the complement of the `sm:*-4` the sides set — move
 * the panel's float and this has to move with it, and two copies would leave one
 * behind. `sheetCeiling` measures the same gap off the element for the gesture.
 */
const CAP = 'sm:max-w-[calc(100%-2rem)]'

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
					'max-sm:rounded-r-none',
					'sm:top-4 sm:right-4 sm:bottom-4',
				],
				left: [
					'inset-y-0 left-0 w-full',
					'max-sm:rounded-l-none',
					'sm:top-4 sm:left-4 sm:bottom-4',
				],
				top: slide.top,
				bottom: slide.bottom,
			},
			// The named steps are max-widths and nothing more, so they stay the shared
			// scale. `fit` is a different kind of answer — the panel takes the width of
			// what it holds — so it is stated here rather than pushed into a scale
			// Dialog also reads.
			//
			// Empty on the axis, because a width the panel shrink-wraps to only means
			// something on the sides it is docked across. The compounds below give it
			// to `right` and `left`; a `top` or `bottom` sheet spans the screen, and
			// shrink-wrapping one would pull a full-width panel into a corner.
			width: { ...shaku.panel, fit: [] },
			surface: {
				glass: [...glass],
				flat: [...panel.surface.bg],
			},
			compound: [
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
	 * sheet resizes across its own scrolling body — laid out in the column with
	 * the slots, the grip would scroll away from the edge it moves. The area is
	 * the full height, so the reach is the panel's rather than the bar's, and
	 * `hannou.grab` carries the rest including the `touch-none` that makes the
	 * gesture work at all under a finger.
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
			'absolute inset-y-0 z-10 px-3 items-center justify-center',
			...hannou.grab,
			// The stroke goes on the bar, not here — see the archetype's grip. This
			// suppresses the browser's own, which would draw around the whole reach.
			'outline-hidden',
			panel.grip.GROUP,
		],
		side: {
			right: 'left-0',
			left: 'right-0',
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
