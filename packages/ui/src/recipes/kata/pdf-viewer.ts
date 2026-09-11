/**
 * PDF-viewer kata: object-literal surface for the `<PdfViewer>` chrome. No
 * variants axis — nested slot groups for the `toolbar`, the collapsible
 * `sidebar`, the `thumbnails` rail and each `thumbnail`, and the `viewport`
 * with its per-`page` frame and skeleton placeholders.
 */
import { mode } from '../../core/recipe'
import { hannou, iro, ji, narabi, omote, sen, sou } from '../kiso'

const { cursor } = hannou
const { palette, text } = iro
const { size, weight } = ji
const { flex } = narabi
const { bg, skeleton } = omote
const { border, focus } = sen

// The page image and every layer drawn over it must sit in the same place, so the centring
// has one home — the rotation half of the same invariant is the `transform` string
// `usePdfViewerPageScale` computes once.
const centred = 'absolute top-1/2 left-1/2 origin-center'

export const k = {
	base: ['relative', flex.col, 'overflow-hidden', bg.surface, border.default],
	/**
	 * Added under `fit: 'width'`, where nothing else gives the viewer a height: `'page'`
	 * derives one from the page's aspect ratio, and withholding that ratio is exactly what
	 * lets the page overflow and scroll. Without this the root sits at `height: auto` in its
	 * host's box and grows to its content instead of filling it.
	 */
	fill: 'h-full min-h-0',
	body: ['flex flex-1 min-h-0'],
	toolbar: {
		base: [
			'flex flex-nowrap items-center justify-between',
			'overflow-x-auto',
			'gap-1',
			'px-2 py-1.5',
			'border-b',
			border.defaultColor,
			'shrink-0',
		],
		section: [flex.row, 'shrink-0', 'gap-1'],
		pageStatus: [size.sm, text.muted, 'tabular-nums select-none whitespace-nowrap'],
	},
	sidebar: {
		base: [
			flex.col,
			'shrink-0 w-56 min-h-0',
			'overflow-hidden',
			'border-r',
			border.defaultColor,
			'transition-[margin] duration-150 ease-in-out',
		],
		closed: '-ml-56',
		header: [
			flex.row,
			'gap-1',
			'px-3 py-2',
			size.md,
			text.muted,
			weight.semibold,
			'shrink-0',
			'select-none',
		],
	},
	thumbnails: {
		base: [flex.col, 'basis-0 grow shrink min-h-0', 'gap-2', 'overflow-y-auto px-4 pb-4'],
		grid: ['grid grid-cols-2', 'gap-2'],
	},
	thumbnail: {
		base: [
			'group/thumb',
			flex.col,
			'items-center',
			'gap-2',
			'bg-transparent',
			'outline-none',
			...cursor,
		],
		frame: [
			'relative block w-full aspect-[3/4]',
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
		image: ['block w-full h-full object-contain'],
		fallback: [flex.row, 'justify-center', 'h-full w-full', size.sm, text.muted],
		placeholder: ['block w-full aspect-[3/4]', skeleton],
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
		],
		/**
		 * Reserved gutter, only where a vertical scrollbar can come and go: under
		 * `fit: 'width'` the page's height is a function of the measured width, so a
		 * scrollbar appearing would narrow the box, shorten the page, and remove itself.
		 * Under `'page'` the page always fits, and reserving a gutter would waste it.
		 */
		scrolls: '[scrollbar-gutter:stable]',
		page: {
			frame: ['relative shrink-0'],
			base: [centred, 'shadow-lg', 'bg-white'],
			placeholder: ['w-full h-full', skeleton],
			empty: [flex.row, 'justify-center', 'w-full h-full', 'py-2', text.muted],
			/**
			 * Hover loupe. The lens is a fixed-size circular window; the stage inside it is a
			 * page-frame-sized box scaled about the pointer, so the page copy it holds needs no
			 * geometry of its own beyond the transform the real page already wears.
			 *
			 * Never interactive: the lens floats over the highlight regions, and a press has to
			 * reach the region rather than stop at the glass.
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
					border.defaultColor,
					...mode('bg-white ring-zinc-950/20', 'dark:bg-zinc-950 dark:ring-white/20'),
				],
				stage: ['absolute top-0 left-0 origin-top-left'],
			},
			// Region overlay. The layer is the page image's twin — same box, same
			// transform — so a region positioned in percentages of it lands on the same
			// ink at every zoom and rotation, with no per-region math.
			highlights: {
				layer: [centred],
				/** No accessible name on any region, so the layer is decoration: nothing to press. */
				inert: ['pointer-events-none'],
				region: {
					base: ['absolute block', 'ring-1 ring-inset', ...cursor, ...focus.inset],
					/** Translucent per-colour wash, from the shared palette. */
					fill: palette.soft.bg,
					/**
					 * The selected region's wash — the palette's doubled rung.
					 *
					 * A heavier stroke alone did not carry it: at 15% over printed ink the fill is
					 * near-invisible either way, so the only thing distinguishing the selection was
					 * one pixel of ring.
					 */
					activeFill: palette.soft.strong,
					ring: palette.outline.ring,
					/**
					 * The selected region: a heavier stroke, and lifted above its neighbours.
					 *
					 * `z-10` matters on a dense page — regions paint in document order, so without
					 * it a later region overlapping the selected one covers the very emphasis that
					 * says which is selected.
					 */
					active: ['ring-4', 'z-10'],
					/**
					 * A resting region under the pointer: the same stroke, doubled.
					 *
					 * A region is a control, and nothing else on the layer said so — the fill and
					 * the stroke are identical whether the boxes are pressable decoration beside a
					 * field list or the navigable surface itself, so a reader had to press one to
					 * find out. The cursor already changes, but only a pointer user sees that, and
					 * only once they are over it.
					 *
					 * A width step rather than a colour or a fill: `activeFill` is what *selected*
					 * looks like, and a hover that previewed it would say the region is chosen a
					 * moment before it is. This lands between `ring-1` and the selection's `ring-4`,
					 * which is the order the three states should read in.
					 *
					 * Applied to resting regions only. On the selected one it would fight `ring-4`
					 * and win — `:hover` outranks a bare class — undoing the emphasis that says
					 * which region is selected. A decorative layer never sees it either way:
					 * {@link inert} takes its pointer events, so nothing there can be hovered.
					 */
					hover: ['hover:ring-2'],
					/**
					 * Every *other* region, while one is selected: the same highlight in neutral.
					 *
					 * On a page carrying twenty-odd washes, making one heavier is not enough to
					 * pick it out — the eye still reads a field of colour. Taking the *colour* off
					 * the rest leaves exactly one thing coloured.
					 *
					 * Only the colour, though. These keep the palette's own zinc fill and ring, at
					 * the same weight as any resting region, so a reader can still see where every
					 * other field sits on the page; blanking them would answer "which one is
					 * selected" by destroying the answer to "where is everything else".
					 *
					 * Both halves of each pair come from the palette for a reason: the colours
					 * being overridden are light/dark pairs, and supplying only a base leaves the
					 * `dark:` half of the old colour standing.
					 */
					dimmed: [palette.soft.bg.zinc, ...palette.outline.ring.zinc],
				},
			},
		},
	},
} as const
