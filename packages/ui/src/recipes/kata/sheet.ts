// biome-ignore-all lint/plugin/no-physical-side: each side of a sheet is a physical edge, and `SheetPanel` resolves `start` and `end` to one

/**
 * Sheet kata: object-literal surface for the `<Sheet>` edge drawer, built by
 * bridging the shared `panel` recipe. The `panel` sub-recipe axes on `side`,
 * `width`, and `surface`. The `backdrop` mirrors the glass/flat surface. The
 * bridged `header` / `title` / `description` / `body` / `footer` slots, the
 * `handle` drag grip, and `motion` complete the dialog chrome.
 */
import { defineRecipe, type VariantProps } from '../../core/recipe'
import { bridge } from '../katakana'
import { hannou, narabi, omote, shaku, ugoki } from '../kiso'
import { panel } from '../kiso/panel'

const { flex, slide } = narabi
const { backdrop } = omote
const { inset } = panel.layout

/**
 * The widest a floating sheet is drawn at: the screen, less the inset it floats on.
 *
 * Stated once because it is the complement of the `*-4` that a floating side
 * sets. Move the panel's float and this has to move with it, and two copies
 * would leave one behind. `sheetCeiling` measures the same gap off the element
 * for the gesture.
 */
const CAP = 'max-w-[calc(100%-2rem)]'

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
				'absolute overflow-y-auto overscroll-contain',
			],
			side: {
				// The `layout` table gives a side its insets and its corners.
				right: 'w-full',
				left: 'w-full',
				//
				// A sheet docked across takes the height of its content. `max-h-full`
				// stops it at the screen, so a tall sheet scrolls its body and does not
				// run off the far edge.
				top: [slide.top, 'max-h-full pt-[env(safe-area-inset-top)]'],
				bottom: [slide.bottom, 'max-h-full pb-[env(safe-area-inset-bottom)]'],
			},
			// The named steps are max-widths and nothing more, so they stay the shared
			// scale. `fit` is a different kind of answer — the panel takes the width of
			// what it holds — so it is stated here rather than pushed into a scale
			// Dialog also reads.
			//
			// Every step is empty on the axis, because a width only means something on
			// the sides it is docked across. The compounds below give each named step
			// to `right` and `left`, and the `layout` table gives `fit` and `full` their
			// classes. A `top` or `bottom` sheet spans the screen, and a cap or a
			// shrink-wrap would pull a full-width panel into a corner.
			width: { ...STEPS, fit: [] },
			surface: panel.surface.axis,
			compound: DOCKED_STEPS,
			defaults: { side: 'right', width: 'md', surface: 'flat' },
		}),
		backdrop: bridge.backdrop(backdrop),
		title: { extra: [inset.x, inset.top] },
		description: { extra: inset.x },
		footer: { extra: [inset.x, inset.bottom] },
		body: {
			extra: [
				flex.fill,
				'overflow-y-auto overscroll-contain',
				inset.x,
				inset.first.sheet,
				inset.last.sheet,
			],
		},
	}),
	/**
	 * The classes of each `layout` of the panel. Each value writes the same
	 * properties, so a breakpoint replaces each one (`resolveVariant`). A `flush`
	 * panel meets the screen edges with square corners. A `floating` panel on a
	 * side stands 1rem in from the edges, and each `floating` panel rounds its
	 * corners. A flush side keeps its content clear of the home indicator in a
	 * page with `viewport-fit=cover`.
	 */
	layout: {
		side: {
			right: {
				flush: 'top-0 right-0 bottom-0 rounded-none pb-[env(safe-area-inset-bottom)]',
				floating: 'top-4 right-4 bottom-4 rounded-xl pb-0',
			},
			left: {
				flush: 'top-0 bottom-0 left-0 rounded-none pb-[env(safe-area-inset-bottom)]',
				floating: 'top-4 bottom-4 left-4 rounded-xl pb-0',
			},
			top: { flush: 'rounded-none', floating: 'rounded-xl' },
			bottom: { flush: 'rounded-none', floating: 'rounded-xl' },
		},
		/**
		 * The width of a `fit` or a `full` panel on a side. A flush panel fills the
		 * screen. A floating panel takes the cap and no second inset: the `w-full`
		 * of the side under the cap already puts the far edge a step in from the
		 * screen's. A second inset over-constrains the box once a drag sets a
		 * width, and the browser can then drop the docked inset, so the sheet comes
		 * away from its edge. A floating `fit` panel takes the width of its content
		 * under the cap.
		 */
		width: {
			fit: { flush: 'w-full max-w-none', floating: `w-max ${CAP}` },
			full: { flush: 'w-full max-w-none', floating: `w-full ${CAP}` },
		},
	},
	/**
	 * The drag handle: a grab area tall enough to aim at (`base`), and the bar
	 * that it draws as its `::after`, which the reader actually sees (`bar`).
	 *
	 * On a sheet docked to a side, the grip rides the inline edge of the panel and
	 * not the column of slots, because the slots run along it. The grab area is
	 * the full height, so the reach is the panel's rather than the bar's. On a
	 * sheet docked across, the grip is a row at the edge that faces the screen.
	 * Neither covers a slot. `hannou.grab.default` carries the rest, including the
	 * `touch-none` that makes the gesture work at all under a finger.
	 *
	 * `side` puts it on the edge that faces the screen: a right-hand sheet grows
	 * leftward, so its grip is on the left.
	 */
	handle: {
		base: [
			flex.col,
			'z-10 items-center justify-center',
			...hannou.grab.default,
			// The stroke goes on the bar, not here — see the archetype's grip. This
			// suppresses the browser's own, which would draw around the whole reach.
			'outline-hidden',
		],
		side: {
			// The full-height reach belongs to the two side arms only. In the base, it
			// survives the `bottom-0` of a cross arm, and the strip covers the panel.
			// On a side, the strip lies over the inset and is as thick as the inset at
			// each density step, so it covers no slot.
			right: ['absolute inset-y-0 left-0', inset.grip.x],
			left: ['absolute inset-y-0 right-0', inset.grip.x],
			// Across, the strip is a row of the panel at its edge, as the grip of a
			// drawer is. It lies over the inset of the slot next to it and keeps the
			// reach of the drawer grip. `sticky` holds it at the edge when the panel
			// scrolls.
			top: ['sticky bottom-0 order-last w-full shrink-0 py-3', inset.grip.over.top],
			bottom: ['sticky top-0 w-full shrink-0 py-3', inset.grip.over.bottom],
		},
		/** Keyed by the separator's own line: a sheet docked to a side is grabbed the other way from one docked across. */
		bar: panel.grip.bar,
	},
	motion: ugoki.panel,
	/** The motion under reduced motion: the panel shows with no slide. */
	still: {
		right: ugoki.still(ugoki.panel.right),
		left: ugoki.still(ugoki.panel.left),
		top: ugoki.still(ugoki.panel.top),
		bottom: ugoki.still(ugoki.panel.bottom),
	},
}

/** Recipe variant props for the {@link Sheet} panel — its styling axes (`side`, `width`, `surface`), for consumers composing custom slots. */
export type SheetPanelVariants = Omit<
	VariantProps<typeof k.panel>,
	'side' | 'width' | 'surface'
> & {
	/** The edge of the screen that the panel docks to. @defaultValue 'right' */
	side?: VariantProps<typeof k.panel>['side']
	/** The maximum width of a panel on the left or the right side. `fit` takes the width of the content. @defaultValue 'md' */
	width?: VariantProps<typeof k.panel>['width']
	/** The surface of the panel: `flat` is opaque, and `glass` is translucent and blurred. @defaultValue 'flat' */
	surface?: VariantProps<typeof k.panel>['surface']
}
