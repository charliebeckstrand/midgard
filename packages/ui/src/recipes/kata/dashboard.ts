/**
 * Dashboard kata: the surface of the dashboard module. It styles the canvas, the
 * tile chrome, the drag grip, the resize splitters, and the landing placeholder.
 * The widgets inside a tile keep their own recipes.
 *
 * Each class list that is not a recipe is one string, joined once at module load.
 * `cn` memoizes a call by a walk over its strings (`core/cn.ts`). A string takes
 * one memo node and one lookup on each render of a tile. An array takes one node
 * and one lookup for each of its items.
 */
import { defineRecipe, mode } from '../../core/recipe'
import { hannou, iro, ji, kasane, omote, sen, ugoki } from '../kiso'
import { dan } from '../kiso/dan'

const { fg, grab } = hannou
const { text } = iro
const { rounded } = kasane

/**
 * The column guides in edit mode: a hairline on each interior column boundary,
 * at the center of a gutter. A layer inset by half a gutter carries them, so no
 * guide draws on the outer edge of the board. The root sets the gutter and the
 * column count as CSS variables, because both are props.
 */
const guides = [
	"before:pointer-events-none before:absolute before:content-['']",
	'before:inset-[calc(var(--dashboard-gap)/2)]',
	'before:bg-size-[calc((100%+var(--dashboard-gap))/var(--dashboard-columns))_100%]',
	'before:bg-position-[calc(var(--dashboard-gap)/-2)_0]',
	...mode(
		'before:bg-[linear-gradient(to_right,var(--color-zinc-100)_1px,transparent_1px)]',
		'dark:before:bg-[linear-gradient(to_right,var(--color-zinc-800)_1px,transparent_1px)]',
	),
]

/**
 * The canvas: a CSS grid whose rows the root sizes from the container width. The
 * root is the inline-size container that the row unit reads.
 */
const canvas = defineRecipe({
	// No explicit width: a block grows into its negative margins, which is how the
	// canvas reaches half a gutter past the container on each side.
	base: ['relative grid'],
	editable: { true: guides, false: '' },
	defaults: { editable: false },
})

/**
 * The positioned shell of a tile. The shell carries the grid area and the half-gap
 * inset; the card inside it carries the chrome. A lifted tile sits above the rest.
 *
 * A gliding tile (`data-gliding`) sits at z-index 20. It is over the chrome of the
 * later tiles at 10, and under the lifted tile at 30. A dropped tile has lost its
 * raise, so without it the later tiles paint over the glide.
 */
const tile = defineRecipe({
	base: ['relative min-h-0 min-w-0 data-gliding:z-20'],
	lifted: { true: 'z-30', false: '' },
	defaults: { lifted: false },
})

/**
 * The card of a tile: a column of the header row and the content box. A movable
 * card in edit mode shows a dashed outline. The grip is its drag surface, so the
 * card keeps touch scrolling.
 */
const card = defineRecipe({
	base: ['relative flex size-full min-h-0 flex-col'],
	editable: {
		true: ['select-none', 'outline-dashed', ...mode('outline-zinc-300', 'dark:outline-zinc-700')],
		false: '',
	},
	dragging: { true: 'shadow-xl', false: '' },
	defaults: { editable: false, dragging: false },
})

/**
 * The header row: the grip, the title block, and the actions. It pads its
 * bottom edge as a card header does, so the content keeps a gap below the
 * title.
 *
 * A widget with a fullscreen view of its own, such as a chart with its menu,
 * marks its controls in the row `data-own-fullscreen`. The row then hides the
 * expand control of the tile, so the tile shows one way to go large.
 *
 * An icon-only bare button has a pad around its glyph. The pad adds to the gap
 * of the row, so the gap next to a button looks wider than the gap next to a
 * badge. A negative inline margin at each density step cancels the pad of the
 * button (`kata/button.ts`). Each item of the row then shows the same gap, and
 * the hit area of the button stays the same.
 *
 * At the `sm` step of the card, the negative margin puts two adjacent icon
 * buttons edge to edge. On a coarse pointer, their hit areas then overlap, and
 * the later button takes all of the overlap. The row therefore sets the gap of
 * `TouchTarget` to zero. Each hit area keeps to the width of its button, so
 * adjacent buttons get equal targets that do not overlap. The height keeps
 * the floor.
 */
const header = [
	`flex min-w-0 items-center gap-2 ${dan.space.box.bottom} [--touch-target-gap-x:0px]`,
	'has-data-own-fullscreen:**:data-[slot=dashboard-tile-expand]:hidden',
	'**:data-[variant=bare]:not-data-has-label:density-xs:-mx-0.75',
	'**:data-[variant=bare]:not-data-has-label:density-sm:-mx-1',
	'**:data-[variant=bare]:not-data-has-label:density-md:-mx-1.25',
	'**:data-[variant=bare]:not-data-has-label:density-lg:-mx-1.5',
	'**:data-[variant=bare]:not-data-has-label:density-xl:-mx-1.75',
].join(' ')

/**
 * The title block, which shrinks before it pushes the actions out. Each line in
 * it truncates on its own.
 */
const heading = 'min-w-0 flex-1'

/**
 * The action row at the far end of the header. Its gap is the gap of the header
 * row, so the controls of a widget after it keep the same gap.
 */
const actions = 'flex shrink-0 items-center gap-2'

/**
 * The content box. It fills the height that the header leaves. A widget taller
 * than the box scrolls inside it, so the tile never clips content without a way
 * to reach it. A widget that fills the box, such as a chart, shows no scrollbar.
 *
 * In the re-pack of a narrow board, a widget can claim the height of its content
 * (`natural`). The box then takes that height, and the tile grows to hold it.
 *
 * The content box is the inline-size container of the widget. A container query
 * or a `cqi` unit in the widget therefore reads the tile, and not the board.
 */
const content = defineRecipe({
	base: '@container relative',
	natural: {
		// The box fills the height that the header leaves, and a taller widget scrolls in it.
		false: 'min-h-0 flex-1 overflow-auto',
		// The box takes the height of the widget, and the board gives the tile the rows for it.
		true: 'flex-none',
	},
	defaults: { natural: false },
})

/**
 * The content box of an expanded tile, in its dialog. The tile sets the ratio
 * of its shape on the board, and the box takes its height from its width. A
 * chart that fills its box then has a box to fill, and a small tile such as a
 * stat does not get a tall, empty box. The box keeps the full width, and its
 * height stops at 70% of the viewport or 40rem. A tall, narrow tile therefore
 * gets a wider box than its shape.
 */
const expanded = 'flex max-h-[min(70dvh,40rem)] min-h-0 w-full flex-col'

/** The error state of a tile: a centered message and a retry button. */
const error = `flex size-full flex-col items-center justify-center ${dan.gap.scale.sm} p-2 text-center`

/** The state of a spec tile whose kind no widget claims: a centered message. */
const missing = 'flex size-full items-center justify-center p-2 text-center'

/**
 * The landing placeholder of a dragged tile. It takes the radius of the tile
 * card, which is a card of the `sm` step.
 */
const placeholder = [
	'pointer-events-none',
	rounded.sm,
	...mode('bg-zinc-200/60', 'dark:bg-zinc-800/60'),
].join(' ')

/**
 * The drag grip. It has the box of a bare icon button, so the header row keeps
 * its height when edit mode swaps the controls of the tile for the grip. The
 * floating form sits on the corner of a tile that has no header row.
 */
const handle = defineRecipe({
	base: [
		'flex shrink-0 items-center justify-center',
		dan.size.button.icon,
		rounded.md,
		...grab.default,
		...text.muted,
		...fg.hover,
		...sen.focus.ring,
	],
	floating: {
		true: [
			'absolute start-3 top-3 z-10 shadow-sm',
			...sen.border.default,
			...mode('bg-white/90', 'dark:bg-zinc-900/90'),
		],
		false: '',
	},
	// A lifted grip takes the violet focus ring of a lift. The tile shell keeps its
	// own raise, because the z-10 of the kiso raise ties with the chrome of the
	// later tiles.
	dragging: { true: sen.focus.lifted.outline, false: '' },
	defaults: { floating: false, dragging: false },
})

/**
 * A resize splitter on one edge of a tile. The bar shows on hover, focus, and
 * drag. Where the primary pointer is coarse, the bar stays in view, because a
 * touch screen matches no hover, and a tap matches no focus-visible.
 */
const resizeHandle = defineRecipe({
	base: [
		'absolute z-10 touch-none select-none',
		"after:absolute after:rounded-full after:opacity-0 motion-safe:after:transition-opacity after:content-['']",
		'hover:after:opacity-100 focus-visible:after:opacity-100 data-resizing:after:opacity-100',
		'pointer-coarse:after:opacity-100',
		...mode('after:bg-zinc-400', 'dark:after:bg-zinc-600'),
		...sen.focus.ring,
	],
	edge: {
		e: [
			'inset-y-0 end-0 w-2 cursor-ew-resize',
			'after:inset-y-[calc(50%-1rem)] after:start-[calc(50%-1.5px)] after:w-[3px]',
		],
		s: [
			'inset-x-0 bottom-0 h-2 cursor-ns-resize',
			'after:inset-x-[calc(50%-1rem)] after:top-[calc(50%-1.5px)] after:h-[3px]',
		],
		se: [
			// The corner sits at the end edge, so a right-to-left tile slants the cursor the other way.
			'bottom-0 end-0 size-3 cursor-nwse-resize rtl:cursor-nesw-resize',
			'after:bottom-[3px] after:end-[3px] after:size-1.5',
		],
	},
})

/** The chip that shows the span of a tile while it resizes. */
const readout = [
	'pointer-events-none absolute bottom-3 end-3 z-30',
	rounded.md,
	'px-2 py-1',
	ji.size.xs,
	'tabular-nums',
	'shadow-sm',
	...sen.border.default,
	...omote.bg.surface,
	...mode('text-zinc-700', 'dark:text-zinc-300'),
].join(' ')

export const k = {
	canvas,
	tile,
	card,
	header,
	heading,
	actions,
	content,
	expanded,
	error,
	missing,
	placeholder,
	handle,
	resize: { handle: resizeHandle, readout },
	// Motion transition configs, applied imperatively (`animate()` in
	// `use-dashboard-flip.ts`), never passed to `cn`.
	motion: { glide: ugoki.glide },
} as const
