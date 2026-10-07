/**
 * PDF-viewer kata: object-literal surface for the `<PdfViewer>` chrome. No
 * variants axis — nested slot groups instead:
 *
 * - The `toolbar`.
 * - The magnifier's `settings` dialog.
 * - The collapsible `sidebar`, the `thumbnails` rail, and each `thumbnail`.
 * - The `viewport`, with its per-`page` frame and skeleton placeholders.
 */
import { mode } from '../../core/recipe'
import { hannou, iro, ji, narabi, omote, sen, sou } from '../kiso'
import { dan } from '../kiso/dan'

const { cursor } = hannou
const { palette, text } = iro
const { size, weight } = ji
const { flex } = narabi
const { bg, rail, skeleton } = omote
const { border, focus } = sen

// The page image and every layer drawn over it must sit in the same place, so the centering
// has one home — the rotation half of the same invariant is the `transform` string
// `usePdfViewerPageScale` computes once.
const centered = 'absolute top-1/2 left-1/2 origin-center'

export const k = {
	base: ['relative', flex.col, 'overflow-hidden', bg.surface, border.default],
	/**
	 * Added under `fit: 'width'`, where nothing else gives the viewer a height.
	 * `'page'` derives one from the page's aspect ratio, and withholding that ratio is
	 * exactly what lets the page overflow and scroll. Without this the root sits at
	 * `height: auto` in its host's box and grows to its content instead of filling it.
	 */
	fill: 'h-full min-h-0',
	body: ['flex flex-1 min-h-0'],
	toolbar: {
		// The frame holds the border. The rail masks its whole box, so a border
		// on the rail fades at each edge.
		frame: ['border-b', border.color.default, 'shrink-0'],
		// The bar keeps one row at each width. When it is narrow, it scrolls on
		// the inline axis, and the edge with more controls behind it fades. The
		// padding is inside the scroll container, so the wheel scrolls the bar at
		// each point of its height.
		base: [
			'flex flex-nowrap items-center justify-between',
			dan.gap.scale.xs,
			'px-2 py-1.5',
			...rail,
		],
		section: [flex.row, 'shrink-0', dan.gap.scale.xs],
		total: [size.sm, text.muted, 'tabular-nums select-none whitespace-nowrap'],
	},
	/**
	 * The magnifier's config dialog. `Dialog` owns the panel and `Stack` the column inside it,
	 * so these two slots are only what the choice groups need.
	 */
	settings: {
		/**
		 * One captioned group.
		 *
		 * `Fieldset` puts `pt-4` under its legend. That is the right rhythm for a column of
		 * full-width fields, and too much air over a single row of short options.
		 */
		group: ['[&>legend+*]:pt-2'],
		/**
		 * The options of one group, in a row.
		 *
		 * A `RadioGroup` stacks its fields, and a column is right where each option is a
		 * sentence. Here no option is longer than two words, and three stacked groups of them
		 * make the reader scroll a dialog that would otherwise fit.
		 *
		 * The `mt-0` is a fork, and reads as one: it reaches across to clear the adjacency
		 * margin `narabi.group` sets on every `ToggleGroup`. The honest fix is an
		 * `orientation` axis on `ToggleGroup`. `Rating` routed around the same missing
		 * affordance by hand-rolling `role="radiogroup"` on a span. That fix widens three
		 * public prop types, and so wants its own change rather than this one's.
		 */
		options: [
			flex.row,
			'flex-wrap',
			`${dan.gap.x.xl} ${dan.gap.y.sm}`,
			'[&>[data-slot=field]+[data-slot=field]]:mt-0',
		],
	},
	sidebar: {
		base: [flex.col, 'shrink-0 w-56 min-h-0', 'overflow-hidden', 'border-e', border.color.default],
		/**
		 * The slide, and only for a change the reader made.
		 *
		 * Where the rail starts is derived from the page count, and that count arrives with the
		 * document. The pdf.js parser has to read the file before it can say how many pages
		 * there are. A rail that slid in at that moment read as something arriving late, rather
		 * than as the viewer's own furniture. It is furniture, so it is simply there. A press on
		 * the toolbar's toggle is a change the reader made, and that one travels.
		 */
		travel: 'motion-safe:transition-[margin] duration-150 ease-in-out',
		// The margin on the start side, so the rail leaves toward its own edge in
		// either direction.
		closed: '-ms-56',
		header: [
			flex.row,
			dan.gap.scale.xs,
			'px-3 py-2',
			size.md,
			text.muted,
			weight.semibold,
			'shrink-0',
			'select-none',
		],
	},
	thumbnails: {
		base: [flex.col, 'basis-0 grow shrink min-h-0', dan.gap.scale.sm, 'overflow-y-auto px-4 pb-4'],
		grid: ['grid grid-cols-2', dan.gap.scale.sm],
	},
	thumbnail: {
		base: [
			'group/thumb',
			flex.col,
			'items-center',
			dan.gap.scale.sm,
			'bg-transparent',
			'outline-none',
			...cursor,
		],
		frame: [
			'relative block w-full aspect-3/4',
			'overflow-hidden',
			'opacity-50',
			'after:pointer-events-none after:absolute after:inset-0 after:ring-inset',
			'group-focus-visible/thumb:after:ring-4',
			'group-focus-visible/thumb:after:ring-blue-600',
			'group-focus-visible/thumb:opacity-75',
			'group-data-current/thumb:opacity-100',
			'group-hover/thumb:opacity-75',
			'group-data-current/thumb:hover:opacity-100',
		],
		/**
		 * The page image. A white page on the white rail of light mode has no edge, so the
		 * shadow draws one. It is a filter, not a box shadow, so it follows the page and not
		 * the letterbox of `object-contain`.
		 */
		image: ['block w-full h-full object-contain', 'drop-shadow-sm'],
		fallback: [flex.row, 'justify-center', 'h-full w-full', size.sm, text.muted],
		placeholder: ['block w-full aspect-3/4', skeleton.base],
		label: [
			size.sm,
			text.muted,
			...mode('group-data-current/thumb:text-zinc-950', 'dark:group-data-current/thumb:text-white'),
			'tabular-nums select-none',
		],
	},
	viewport: {
		base: [
			'overflow-auto',
			'flex items-safe-center justify-safe-center',
			'flex-1 min-w-0',
			'max-h-[1280px]',
			'box-content p-4',
			...mode('bg-zinc-100', 'dark:bg-zinc-900'),
			// A tab stop while the page overflows. The scroll clips, so the ring is inset.
			focus.inset,
		],
		/**
		 * Reserved gutter, only where a vertical scrollbar can come and go. Under
		 * `fit: 'width'` the page's height is a function of the measured width. A scrollbar
		 * appearing would therefore narrow the box, shorten the page, and remove itself.
		 * Under `'page'` the page always fits, and reserving a gutter would waste it.
		 */
		scrolls: 'scrollbar-gutter-stable',
		page: {
			frame: ['relative shrink-0'],
			base: [centered, 'shadow-lg', 'bg-white'],
			placeholder: ['w-full h-full', skeleton.base],
			empty: [flex.row, 'justify-center', 'w-full h-full', 'py-2', text.muted],
			/**
			 * Hover loupe. The lens is a fixed-size circular window. The stage inside it is a
			 * page-frame-sized box scaled about the pointer. The page copy it holds therefore
			 * needs no geometry of its own, beyond the transform the real page already wears.
			 *
			 * The lens is never interactive. It floats over the highlight regions, and a press
			 * has to reach the region rather than stop at the glass.
			 */
			magnifier: {
				lens: [
					// A sou rung, not a local z-index: the lens portals to the body, so DOM order
					// decides nothing and the number is the whole contract. It is raised from inside
					// a viewer that is routinely itself inside a Drawer or Dialog, so it has to clear
					// `overlay` — and `lens` sits one above `float` besides, so a tooltip anchored to
					// the region being inspected cannot paint inside the loupe and hide the very
					// content the reader leaned in to read.
					sou.lens,
					'pointer-events-none overflow-hidden',
					'rounded-full',
					'shadow-2xl',
					'ring-1 ring-inset',
					border.color.default,
					...mode('bg-white ring-zinc-950/20', 'dark:bg-zinc-950 dark:ring-white/20'),
				],
				/** The lens diameter for each step of `magnifier.size`: 144, 192 and 240 pixels. */
				size: { sm: 'size-36', md: 'size-48', lg: 'size-60' },
				/**
				 * The copy of the page. Its top-left corner is at the center of the lens, so the
				 * rendered size of the lens sets the center, and the offset math needs no diameter.
				 */
				stage: ['absolute top-1/2 left-1/2 origin-top-left'],
			},
			// Region overlay. The layer is the page image's twin — same box, same
			// transform — so a region positioned in percentages of it lands on the same
			// ink at every zoom and rotation, with no per-region math.
			highlights: {
				base: [centered],
				/**
				 * The layer without `onActiveHighlightChange`. Its regions are decoration inside an
				 * `aria-hidden` layer, so there is nothing to press. Every region still has its
				 * required `label`.
				 */
				inert: ['pointer-events-none'],
				/**
				 * The name drawn over the selected region.
				 *
				 * It takes no pointer events, so on a dense page it stands over boxes the reader can
				 * still hover and press through it. `behind` is the part they see. The name
				 * goes faint over the box they point at. That is the page saying the press lands
				 * there, and not on the name.
				 *
				 * Both go on the panel's positioned wrapper (`surfaceClassName`), not on the panel.
				 * The panel's own entrance animates `opacity`, and motion writes that inline, where
				 * no class reaches it. On the wrapper the two opacities compose, so the name can fade
				 * while its entrance still plays.
				 */
				label: {
					base: 'transition-opacity duration-100 ease-out',
					behind: 'opacity-25',
				},
				region: {
					base: ['absolute block', 'ring-1 ring-inset', ...cursor, ...focus.inset],
					/** Translucent per-color wash, from the shared palette. */
					fill: palette.soft.bg,
					ring: palette.outline.ring,
					/** The selected region: its stroke and lift (`base`), and its wash (`fill`). */
					active: {
						/**
						 * A heavier stroke, and lifted above its neighbors.
						 *
						 * `z-10` matters on a dense page. Regions paint in document order. Without it, a
						 * later region overlapping the selected one covers the very emphasis that says
						 * which is selected.
						 */
						base: ['ring-4', 'z-10'],
						/**
						 * The wash — the palette's doubled rung.
						 *
						 * A heavier stroke alone did not carry it. At 15% over printed ink the fill is
						 * near-invisible either way, so the only thing distinguishing the selection was
						 * one pixel of ring.
						 */
						fill: palette.soft.strong,
					},
					/**
					 * A resting region under the pointer: the same stroke, doubled.
					 *
					 * A region is a control, and nothing else on the layer said so. The fill and the
					 * stroke are identical whether the boxes are pressable decoration beside a field
					 * list, or the navigable surface itself. A reader therefore had to press one to
					 * find out. The cursor already changes, but only a pointer user sees that, and
					 * only once they are over it.
					 *
					 * A width step rather than a color or a fill. `active.fill` is what *selected*
					 * looks like, and a hover that previewed it would say the region is chosen a
					 * moment before it is. This lands between `ring-1` and the selection's `ring-4`,
					 * which is the order the three states must read in.
					 *
					 * Applied to resting regions only. On the selected one it would fight `ring-4`
					 * and win — `:hover` outranks a bare class — undoing the emphasis that says
					 * which region is selected. A decorative layer never sees it either way:
					 * `inert` takes its pointer events, so nothing there can be hovered.
					 */
					hover: ['hover:ring-2'],
					/**
					 * Every *other* region, while one is selected: the same highlight in neutral.
					 *
					 * On a page carrying twenty-odd washes, making one heavier is not enough to
					 * pick it out — the eye still reads a field of color. Taking the *color* off
					 * the rest leaves exactly one thing colored.
					 *
					 * Only the color, though. These keep the palette's own zinc fill and ring, at
					 * the same weight as any resting region. A reader can therefore still see where
					 * every other field sits on the page. Blanking them would answer "which one is
					 * selected" by destroying the answer to "where is everything else".
					 *
					 * Both halves of each pair come from the palette for a reason. The colors being
					 * overridden are light/dark pairs, and supplying only a base leaves the `dark:`
					 * half of the old color standing.
					 */
					dimmed: [palette.soft.bg.zinc, ...palette.outline.ring.zinc],
				},
			},
		},
	},
} as const
