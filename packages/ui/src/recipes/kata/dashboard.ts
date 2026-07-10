/**
 * Dashboard kata: object-literal surface for the dashboard module — the
 * proportional grid canvas, its editing guides (an outline and vertical
 * column lines only: tiles float upward, so horizontal rules would promise
 * rows that don't exist), the tile shell and its drag placeholder, the grip
 * handle in its inline and floating postures, the edge resize handles, and
 * the resize readout chip. Motion rides the shared `ugoki.spring` so tiles
 * glide on the same physics as the rest of the system.
 */
import { defineRecipe, mode } from '../../core/recipe'
import { iro, sen } from '../kiso'

const { text } = iro

/**
 * The editing underlay's inks: a hairline column grid drawn as a repeating
 * horizontal gradient (the cell width comes from the grid as an inline
 * `background-size`, the one geometry input the recipe can't know) and a
 * boundary outline, both a step off the surface so the guides read as
 * scaffolding under the tiles, never chrome over them.
 */
const guides = [
	'rounded-lg',
	...mode('ring-1 ring-zinc-200', 'dark:ring-zinc-800'),
	...mode(
		'[background-image:linear-gradient(to_right,var(--color-zinc-100)_1px,transparent_1px)]',
		'dark:[background-image:linear-gradient(to_right,var(--color-zinc-800)_1px,transparent_1px)]',
	),
]

/**
 * The positioned tile shell. It owns nothing visual — the content box inside
 * carries the surface — but while its tile rides the drag overlay the shell
 * stays behind as the snapped placeholder, and while it is being resized it
 * lifts over its neighbours so the preview reads on top.
 */
const item = defineRecipe({
	base: ['absolute'],
	dragging: { true: 'z-10', false: '' },
	lifted: { true: 'z-20', false: '' },
	defaults: { dragging: false, lifted: false },
})

/**
 * The tile's content box: a quiet card one shade off the page, slightly
 * translucent so the editing guides read through the gaps but never through
 * a tile. Rounded but unclipped — the resize handles ride just outside its
 * edges. In editing mode every tile wears a dashed border, so the mutable
 * cells read at a glance; the drop placeholder stays border-free and the
 * travelling clone keeps the same dashed frame.
 */
const content = defineRecipe({
	base: [
		'relative size-full min-w-0',
		'rounded-lg p-3',
		...mode('bg-zinc-50/85', 'dark:bg-zinc-900/85'),
	],
	editing: {
		true: ['border border-dashed', ...mode('border-zinc-300', 'dark:border-zinc-700')],
		false: '',
	},
	defaults: { editing: false },
})

/**
 * The drop placeholder filling a dragged tile's snapped cell: a quiet fill
 * and nothing more — the dashed frames belong to the tiles, and the
 * travelling clone already shows exactly what will land here.
 */
const placeholder = [
	'absolute inset-0',
	'rounded-lg',
	...mode('bg-zinc-200/50', 'dark:bg-zinc-800/50'),
]

/**
 * The grip handle: inline it sits in a chart header's leading slot at icon
 * size; floating it chips onto the tile's top-leading corner on its own
 * small surface, for content that never adopts it.
 */
const handle = defineRecipe({
	base: [
		'flex size-6 shrink-0 cursor-grab touch-none select-none items-center justify-center rounded-md',
		'active:cursor-grabbing',
		...text.muted,
		...mode(
			'hover:bg-zinc-100 hover:text-zinc-700',
			'dark:hover:bg-zinc-800 dark:hover:text-zinc-300',
		),
		...sen.focus.ring,
	],
	floating: {
		true: [
			'absolute left-1.5 top-1.5 z-10',
			'border shadow-sm',
			...mode('border-zinc-200 bg-white/90', 'dark:border-zinc-800 dark:bg-zinc-900/90'),
		],
		false: '',
	},
	inert: {
		// The drag overlay's decorative clone: same grip, no gesture to offer.
		true: 'cursor-default',
		false: '',
	},
	defaults: { floating: false, inert: false },
})

/**
 * One edge resize handle: a slim strip along the tile's east or south edge,
 * or the corner square, each carrying its axis cursor. The visible thumb is
 * the `after` pill, faded in on hover, focus, or an active resize so tiles
 * stay clean at rest.
 */
const resizeHandle = defineRecipe({
	base: [
		'absolute touch-none select-none',
		"after:absolute after:rounded-full after:opacity-0 after:transition-opacity after:content-['']",
		'hover:after:opacity-100 focus-visible:after:opacity-100 data-[resizing]:after:opacity-100',
		...mode('after:bg-zinc-400', 'dark:after:bg-zinc-600'),
		...sen.focus.ring,
	],
	edge: {
		e: [
			'inset-y-0 -right-1 w-2 cursor-ew-resize',
			'after:inset-y-[calc(50%-1rem)] after:left-[calc(50%-1.5px)] after:w-[3px]',
		],
		s: [
			'inset-x-0 -bottom-1 h-2 cursor-ns-resize',
			'after:inset-x-[calc(50%-1rem)] after:top-[calc(50%-1.5px)] after:h-[3px]',
		],
		se: [
			'-bottom-1 -right-1 size-3 cursor-nwse-resize',
			'after:bottom-[3px] after:right-[3px] after:size-1.5',
		],
	},
})

/** The floating resize readout: cell span and pixel size, tabular so it never jitters. */
const readout = [
	'pointer-events-none z-30',
	'rounded-md border px-2 py-1',
	'text-xs tabular-nums',
	'shadow-sm',
	...mode(
		'border-zinc-200 bg-white text-zinc-700',
		'dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300',
	),
]

export const k = {
	/** The grid canvas: a proportional box the tiles position into. */
	base: ['relative w-full'],
	/** The editing underlay, gated on the grid's editing state. */
	guides: (editing: boolean) => (editing ? guides : []),
	item,
	content,
	placeholder,
	handle,
	resizeHandle,
	readout,
	/**
	 * Tile glide physics: softer than the shared `ugoki.spring` — a displaced
	 * tile eases out of the way rather than snapping, since during a drag the
	 * eye is on the pointer and fast neighbour motion reads as jitter.
	 */
	motion: { flip: { type: 'spring' as const, stiffness: 220, damping: 30 } },
} as const
