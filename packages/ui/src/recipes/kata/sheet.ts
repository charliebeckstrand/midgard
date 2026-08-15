/**
 * Sheet kata: object-literal surface for the `<Sheet>` edge drawer, built by
 * bridging the shared `panel` recipe. The `panel` sub-recipe axes on `side`,
 * `width`, and `surface`; `backdrop` mirrors the glass/flat surface, and the
 * bridged `title` / `description` / `body` / `footer` slots plus `motion`
 * complete the dialog chrome.
 */
import { defineRecipe, mode, type VariantProps } from '../../core/recipe'
import { bridge } from '../katakana'
import { hannou, narabi, omote, sen, shaku, ugoki } from '../kiso'
import { panel } from '../kiso/panel'

const { flex, slide } = narabi
const { glass, backdrop } = omote

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
			width: shaku.panel,
			surface: {
				glass: [...glass],
				flat: [...panel.surface.bg],
			},
			compound: [
				{ side: 'right', width: 'full', class: 'sm:left-4 sm:max-w-[calc(100%-2rem)]' },
				{ side: 'left', width: 'full', class: 'sm:right-4 sm:max-w-[calc(100%-2rem)]' },
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
			'absolute inset-y-0 z-10 w-4 items-center justify-center',
			...hannou.grab,
			'outline-hidden',
			sen.focus.inset,
		],
		side: {
			right: 'left-0',
			left: 'right-0',
			top: 'inset-x-0 bottom-0 h-4 w-full',
			bottom: 'inset-x-0 top-0 h-4 w-full',
		},
		bar: ['h-10 w-1.5 rounded-full', ...mode('bg-zinc-950/20', 'dark:bg-white/25')],
	},
	motion: ugoki.panel,
}

/** Recipe variant props for the {@link Sheet} panel — its styling axes (`side`, `width`, `surface`), for consumers composing custom slots. */
export type SheetPanelVariants = VariantProps<typeof k.panel>
