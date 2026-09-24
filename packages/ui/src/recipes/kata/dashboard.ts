/**
 * Dashboard kata: the surface of the dashboard module. It styles the canvas, the
 * tile chrome, the drag grip, the resize splitters, and the landing placeholder.
 * The widgets inside a tile keep their own recipes.
 */
import { defineRecipe, mode } from '../../core/recipe'
import { hannou, iro, sen } from '../kiso'

const { grab } = hannou
const { text } = iro

/**
 * The column guides in edit mode: a hairline on each interior column boundary,
 * at the centre of a gutter. A layer inset by half a gutter carries them, so no
 * guide draws on the outer edge of the board. The root sets the gutter and the
 * column count as CSS variables, because both are props.
 */
const guides = [
	"before:pointer-events-none before:absolute before:content-['']",
	'before:inset-[calc(var(--dashboard-gap)/2)]',
	'before:[background-size:calc((100%_+_var(--dashboard-gap))_/_var(--dashboard-columns))_100%]',
	'before:[background-position:calc(var(--dashboard-gap)_/_-2)_0]',
	...mode(
		'before:[background-image:linear-gradient(to_right,var(--color-zinc-100)_1px,transparent_1px)]',
		'dark:before:[background-image:linear-gradient(to_right,var(--color-zinc-800)_1px,transparent_1px)]',
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
 */
const tile = defineRecipe({
	base: ['relative min-h-0 min-w-0'],
	lifted: { true: 'z-30', false: '' },
	defaults: { lifted: false },
})

/**
 * The card of a tile: a column of the header row and the content box. A movable
 * card in edit mode is a drag surface, so it takes the grab cursor. It keeps
 * touch scrolling, and the grip is the handle on a touch screen.
 */
const card = defineRecipe({
	base: ['relative flex size-full min-h-0 flex-col'],
	editable: {
		true: [
			// The cursors alone: the card keeps touch scrolling, and the grip is the
			// handle on a touch screen.
			...grab.cursor,
			'select-none',
			'outline-dashed',
			...mode('outline-zinc-300', 'dark:outline-zinc-700'),
		],
		false: '',
	},
	dragging: { true: 'shadow-xl', false: '' },
	defaults: { editable: false, dragging: false },
})

/** The header row: the grip, the title block, and the actions. */
const header = ['flex min-w-0 items-center gap-2']

/** The title block, which truncates before it pushes the actions out. */
const heading = ['min-w-0 flex-1 truncate']

/** The action row at the far end of the header. */
const actions = ['flex shrink-0 items-center gap-1']

/**
 * The spark veil, which the card applies. A chart at the spark tier writes
 * `data-tier="spark"` on its root, and the card reads it through `:has()`, so no
 * code crosses the module boundary. The header then leaves the flow for a veil
 * over the top of the content, and the sparkline takes the full height. This is
 * the posture of the chart's own title at the spark tier.
 */
const veil = {
	/**
	 * In both modes, the header overlays the content on the popover surface. The
	 * content box therefore keeps one height when edit mode switches.
	 */
	overlay: [
		'has-[[data-tier=spark]]:*:data-[slot=card-header]:absolute',
		'has-[[data-tier=spark]]:*:data-[slot=card-header]:inset-x-2',
		'has-[[data-tier=spark]]:*:data-[slot=card-header]:top-2',
		'has-[[data-tier=spark]]:*:data-[slot=card-header]:z-10',
		'has-[[data-tier=spark]]:*:data-[slot=card-header]:rounded-sm',
		'has-[[data-tier=spark]]:*:data-[slot=card-header]:px-1',
		'has-[[data-tier=spark]]:*:data-[slot=card-header]:py-1',
		'has-[[data-tier=spark]]:*:data-[slot=card-header]:transition-opacity',
		'has-[[data-tier=spark]]:*:data-[slot=card-header]:duration-150',
		...mode(
			'has-[[data-tier=spark]]:*:data-[slot=card-header]:bg-white/90',
			'dark:has-[[data-tier=spark]]:*:data-[slot=card-header]:bg-zinc-800/75',
		),
	],
	/**
	 * At rest, the veil fades out and lets the pointer through, until the card is
	 * hovered or holds focus. A tab onto a control of the header therefore shows
	 * it. Edit mode leaves this off, so the grip stays in view.
	 */
	fade: [
		'has-[[data-tier=spark]]:not-hover:not-focus-within:*:data-[slot=card-header]:opacity-0',
		'has-[[data-tier=spark]]:not-hover:not-focus-within:*:data-[slot=card-header]:pointer-events-none',
	],
} as const

/**
 * The content box. It fills the height that the header leaves. A widget taller
 * than the box scrolls inside it, so the tile never clips content without a way
 * to reach it. A widget that fills the box, such as a chart, shows no scrollbar.
 */
const content = ['relative min-h-0 flex-1 overflow-auto']

/**
 * The content box of an expanded tile, in its dialog. It gives the widget a
 * height, so a chart that fills its box has a box to fill.
 */
const expanded = ['flex h-[min(70dvh,40rem)] min-h-0 flex-col']

/** The error state of a tile: a centered message and a retry button. */
const error = ['flex size-full flex-col items-center justify-center gap-2 text-center']

/** The state of a spec tile whose kind no widget claims: a centered message. */
const missing = ['flex size-full items-center justify-center p-2 text-center']

/** The landing placeholder of a dragged tile. */
const placeholder = [
	'pointer-events-none rounded-lg',
	...mode('bg-zinc-200/60', 'dark:bg-zinc-800/60'),
]

/** The drag grip. The floating form sits on the corner of a tile that has no header row. */
const handle = defineRecipe({
	base: [
		'flex size-6 shrink-0 items-center justify-center rounded-md',
		...grab.default,
		...text.muted,
		...mode(
			'hover:bg-zinc-100 hover:text-zinc-700',
			'dark:hover:bg-zinc-800 dark:hover:text-zinc-300',
		),
		...sen.focus.ring,
	],
	floating: {
		true: [
			'absolute left-3 top-3 z-10',
			'border shadow-sm',
			...mode('border-zinc-200 bg-white/90', 'dark:border-zinc-800 dark:bg-zinc-900/90'),
		],
		false: '',
	},
	defaults: { floating: false },
})

/** A resize splitter on one edge of a tile. The bar shows on hover, focus, and drag. */
const resizeHandle = defineRecipe({
	base: [
		'absolute z-10 touch-none select-none',
		"after:absolute after:rounded-full after:opacity-0 after:transition-opacity after:content-['']",
		'hover:after:opacity-100 focus-visible:after:opacity-100 data-[resizing]:after:opacity-100',
		...mode('after:bg-zinc-400', 'dark:after:bg-zinc-600'),
		...sen.focus.ring,
	],
	edge: {
		e: [
			'inset-y-0 right-0 w-2 cursor-ew-resize',
			'after:inset-y-[calc(50%-1rem)] after:left-[calc(50%-1.5px)] after:w-[3px]',
		],
		s: [
			'inset-x-0 bottom-0 h-2 cursor-ns-resize',
			'after:inset-x-[calc(50%-1rem)] after:top-[calc(50%-1.5px)] after:h-[3px]',
		],
		se: [
			'bottom-0 right-0 size-3 cursor-nwse-resize',
			'after:bottom-[3px] after:right-[3px] after:size-1.5',
		],
	},
})

/** The chip that shows the span of a tile while it resizes. */
const readout = [
	'pointer-events-none absolute bottom-3 right-3 z-30',
	'rounded-md border px-2 py-1',
	'text-xs tabular-nums',
	'shadow-sm',
	...mode(
		'border-zinc-200 bg-white text-zinc-700',
		'dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300',
	),
]

export const k = {
	canvas,
	tile,
	card,
	header,
	heading,
	actions,
	veil,
	content,
	expanded,
	error,
	missing,
	placeholder,
	handle,
	resizeHandle,
	readout,
} as const
