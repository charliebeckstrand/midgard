/**
 * Data-table kata: object-literal surface for the table chrome that sits
 * around `kata/table` — sticky head, batch-action bar, sort controls, column
 * drag-reorder, and the row-loading pulse. No top-level variants axis; the only
 * sub-recipe is the `sort.icon`, inked or muted by whether its column is the
 * active sort.
 */
import { defineRecipe, mode } from '../../core/recipe'
import { hannou, iro, ji, kasane, narabi, omote, sen, ugoki } from '../kiso'

const { cursor, fg } = hannou
const { text } = iro
const { size, weight } = ji
const { rounded } = kasane
const { flex } = narabi
const { bg } = omote
const { border, focus } = sen
const { css } = ugoki

/** Sort-direction arrow: inked while its column is the active sort, muted otherwise. */
const sortIcon = defineRecipe({
	active: { true: text.default, false: text.muted },
	defaults: { active: false },
})

/**
 * Density-scaled resize metrics, projected from the `<table>` element onto the
 * resizable headers (those carrying `data-resizable`) so they override the
 * density cell padding at higher specificity without `!important`. Keyed by the
 * friendly density level the grid forwards to `<Table>`. Two coupled measures:
 *
 * - the header's trailing padding, so its label clears the handle; and
 * - the resize handle's own width (the handle can't size itself — only the table
 *   knows the density).
 *
 * Both track the density's horizontal cell padding (`px-1`/`px-2`/`px-3` →
 * 4/8/12px): the grab zone is twice that padding and anchored to the trailing
 * edge, so its centred grip (`justify-center`; see `handle`) lands exactly one
 * cell-padding in from that edge — flush with where the header label and body
 * values truncate, so the grip meets the value instead of cutting through it.
 */
const resizeMetrics = defineRecipe({
	density: {
		compact: [
			'[&>*>tr>th[data-resizable]]:pr-2',
			'[&>*>tr>th[data-resizable]>[role=separator]]:w-2',
		],
		snug: ['[&>*>tr>th[data-resizable]]:pr-4', '[&>*>tr>th[data-resizable]>[role=separator]]:w-4'],
		loose: ['[&>*>tr>th[data-resizable]]:pr-6', '[&>*>tr>th[data-resizable]>[role=separator]]:w-6'],
	},
	defaults: { density: 'snug' },
})

/**
 * Opaque fill behind every sticky grid surface — the sticky header bar and the
 * frozen header/body cells alike — so the rows and columns scrolling under them
 * stay hidden. It tracks the content host (`omote.content` — the same
 * viewport-aware surface the sidebar layout paints behind its sticky headers):
 * the card surface at `lg`, and the flush page background below it. A plain
 * `bg.surface` painted the desktop card colour at every width, so on mobile —
 * where the content block is transparent over the darker page — these surfaces
 * read a shade off (standing out as a box against the page).
 */
const hostSurface = mode('bg-white', ['dark:bg-zinc-950', 'dark:lg:bg-zinc-900'])

/**
 * Opaque fill the actively dragged reorder column paints while lifted, so the
 * sibling columns it slides over stay hidden behind it — a transparent `<th>` /
 * `<td>` let their text bleed through (and `opacity` could only soften, never
 * stop, that bleed). Tracks the same viewport-aware content host as
 * {@link hostSurface} — the table's own effective background — so the lifted
 * column reads as a solid slice of the table rather than a shade-off box, gated
 * on the `data-[dragging]` state the dragged column's cells carry.
 */
const draggingSurface = mode('data-[dragging]:bg-white', [
	'dark:data-[dragging]:bg-zinc-950',
	'dark:lg:data-[dragging]:bg-zinc-900',
])

/**
 * The group rail's 2px neutral left border — a continuous bar down the group's
 * leading edge. Shared by the padded group cells (which add `py-0`, managing
 * their own padding through the reveal wrapper) and the loading placeholder
 * rows (which keep ordinary cell padding), so the rail runs unbroken while a
 * group's children load.
 */
const railBorder = ['border-l-2', ...mode('border-zinc-950/5', 'dark:border-white/10')]

export const k = {
	// `isolate` scopes the grid's internal sticky/pinned z-indices to its own
	// stacking context: the frozen header rides `z-20` and the sticky header `z-10`,
	// which must layer among themselves but must not leak out to overlap a host's
	// sticky chrome — e.g. a SidebarLayout's own `z-20` page header the grid scrolls
	// beneath (without isolation the grid's later-in-DOM `z-20` frozen header wins
	// the tie and paints over it). Portaled surfaces (the column-manager dialog,
	// context menus, tooltips) render at the body, outside this context, so they
	// still overlay the page.
	// While a column drag-resize is in flight the wrapper carries `data-resizing`,
	// which paints the resize cursor grid-wide; head and cells read the matching
	// `resizing` context flag to drop their hover wash and truncation tooltips.
	wrapper: ['relative', 'isolate', flex.col, 'gap-2', 'data-[resizing]:cursor-col-resize'],
	sticky: {
		wrapper: 'overflow-auto [&>[data-slot=table]]:!overflow-visible',
		// Sticky header bar: an opaque fill so body rows tuck under it on a vertical
		// scroll. Tracks the content host (see `hostSurface`) so it matches the page
		// background on mobile and the card surface on desktop — a plain `bg.surface`
		// painted the desktop card colour at every width and stood out as a box
		// against the transparent content block on mobile.
		head: ['sticky top-0 z-10', hostSurface],
	},
	pinned: {
		// Frozen data cell: opaque surface so the scrolling columns don't show
		// through, lifted just above the centre cells (below the z-10 sticky head,
		// so a vertical scroll still tucks pinned cells under it). The fill tracks
		// the content host across viewports (see `hostSurface`); the left/right
		// offset is an inline style summed from the engine.
		cell: ['sticky z-[1]', hostSurface],
		// Frozen header cell: above the sticky head so the top corner stays on top.
		// Shares the sticky header's viewport-aware fill (see `hostSurface`) so the
		// pinned header tracks the content host instead of painting the desktop card
		// colour at every width — which, on mobile, stood out as a box against the
		// transparent content block over the darker page.
		head: ['sticky z-20', hostSurface],
		// Edge border on a frozen group's scroll-facing boundary: a 2px rule on the
		// right of a left group's innermost column, the left of a right group's. Only
		// that boundary column carries it (see `pinnedClassName`), so a stack of pinned
		// and/or locked columns shows one rule, not one per column. Drawn as an
		// `::after` overlay, not a CSS `border`: the table collapses borders
		// (`border-collapse: collapse`), so a real cell border joins the table grid and
		// scrolls away with the overflow instead of staying on the frozen column. The
		// overlay rides the sticky cell and holds — the same reason the edge cue below
		// is a box-shadow. `inset-y-0`/`w-0.5` make a 2px full-height rule at the inner
		// edge; `pointer-events-none` keeps it inert.
		borderRight: [
			"after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-0.5 after:content-['']",
			'after:bg-zinc-950/10',
			'dark:after:bg-white/10',
		],
		borderLeft: [
			"after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-0.5 after:content-['']",
			'after:bg-zinc-950/10',
			'dark:after:bg-white/10',
		],
		// Separating shadow at a frozen group's inner edge, cast toward the scroll.
		edgeLeft: ['shadow-[1px_0_3px_rgba(0,0,0,0.08)]', 'dark:shadow-[1px_0_3px_rgba(0,0,0,0.5)]'],
		edgeRight: ['shadow-[-1px_0_3px_rgba(0,0,0,0.08)]', 'dark:shadow-[-1px_0_3px_rgba(0,0,0,0.5)]'],
	},
	// The toolbar region above the table — see `GridToolbar`, the single home for
	// the grid's above-table controls. A vertical stack of the top control row and,
	// while a row is selected, the batch-action row beneath it.
	toolbar: {
		root: ['flex', 'flex-col', 'gap-2'],
		// Top row: the quick-search field at the start, the column-manager trigger at
		// the end. Stacks on narrow viewports, then lays out as a row from `sm`.
		bar: ['flex', 'flex-col', 'gap-2', 'sm:flex-row', 'sm:items-center'],
		// Column-manager cluster: pushed to the row's end from `sm` so it sits across
		// from the search field (and stays at the end even when it stands alone).
		actions: 'sm:ml-auto',
	},
	// The group panel between the toolbar and the table (see `GridGroupByPanel`):
	// the drop target a groupable column's header affordance drags into, carrying
	// the active group as a removable `Badge` chip (the drag ghost and the empty
	// hint are a `Badge` and `Text`, so this surface carries only the panel shell
	// and the drag-handle cursor). Dashed at rest — an invitation to drop — and
	// lifted solid-accent while a drag hovers it (`data-over`).
	groupPanel: {
		root: [
			flex.row,
			'items-center',
			'min-h-11',
			'gap-2',
			'px-3',
			'py-1.5',
			border.subtle,
			rounded.lg,
			'border-dashed',
			'data-[over]:border-solid',
			...mode('data-[over]:border-blue-600', 'dark:data-[over]:border-blue-500'),
		],
		// Header affordance on a groupable column: press to group, or drag into the
		// panel. Grab cursor at rest (the `Button` carries the rest of the styling).
		// `touch-none` keeps a touch-drag from scrolling the page instead of lifting the column.
		handle: ['cursor-grab active:cursor-grabbing', 'touch-none select-none'],
	},
	batch: {
		bar: [
			flex.row,
			'min-h-12',
			'gap-2',
			'px-2',
			'py-1',
			border.subtle,
			rounded.lg,
			'border-b',
			bg.tint,
		],
		count: [weight.medium, 'whitespace-nowrap', size.sm, text.muted],
	},
	selectCell: 'w-px text-center align-middle [line-height:0]',
	actionsCell: 'w-px whitespace-nowrap',
	expanderCell: 'w-px text-center align-middle [line-height:0]',
	cell: {
		// One-line cell content that truncates to an ellipsis at the column width.
		// `block` gives the span the cell's width so the fixed/auto column bounds it.
		truncate: ['block', 'truncate'],
		// Truncation tooltip surface: cap the width and let long text wrap inside.
		tooltip: ['max-w-xs', 'whitespace-normal', 'break-words'],
	},
	head: {
		// One-line header title that truncates to an ellipsis when it outgrows the
		// column. `min-w-0` overrides the flex item's `min-width: auto` so it shrinks
		// within the header's flex slot — and, for a sortable column, within the sort
		// button — instead of pushing past the cell into its neighbour.
		title: ['block', 'truncate', 'min-w-0'],
		// A frozen column's header affordances: the pin button paired with the title.
		pinned: {
			// Leading group pairing a pinned column's pin button with its title. `min-w-0`
			// keeps the title shrinkable so it still truncates beside the button; `gap-1`
			// sets the button-to-title spacing.
			label: [flex.inline, 'min-w-0', 'gap-1'],
			// Pin button on a frozen column's header: an icon-only control that unpins the
			// column. Muted at rest, tinting on hover/focus so it reads as the actionable
			// affordance it is. `-ml-1` pulls the button left by the Pin glyph's optical
			// inset so the visible pin lands over the column's cell values rather than a
			// step to their right. The Pin's leftmost ink sits ~4px into its `size-5` box
			// (x=5 of lucide's 24-unit grid, scaled by 20/24) — shallower than the grip's
			// dots at x=8 — so it takes a smaller pull than the grip's `-ml-1.5`; a shared
			// value would over-pull one glyph or the other. That pull seats the box flush
			// to the table's horizontal scroll wrapper (`overflow-x-auto`, see
			// `components/table`), which clips an outset outline at its edge; the focus ring
			// is therefore `inset` — clip-safe, like `k.nav.cell` and unlike the inboard
			// `k.sort.button`, whose outset `ring` clears the edge.
			// The 20px glyph is below the 24x24 minimum target (WCAG 2.5.8). A centered,
			// transparent `::before` expands the *hit* area to >=24x24 without moving the
			// glyph (so the optical `-ml` alignment and inset ring are untouched) — growing
			// the box itself would re-center the icon off that tuned inset.
			button: [
				flex.inline,
				'shrink-0',
				'-ml-1',
				'relative',
				"before:absolute before:-inset-1 before:content-['']",
				text.muted,
				fg.hover,
				focus.inset,
				cursor,
				'select-none',
			],
		},
	},
	sort: {
		// `min-w-0` lets the button shrink within the header slot so its title can
		// truncate; the title carries the ellipsis while the sort arrow holds its size.
		button: [flex.inline, 'min-w-0', text.muted, fg.hover, focus.ring, cursor, 'select-none'],
		icon: sortIcon,
		// Priority number beside the arrow under a multi-column sort: small, muted,
		// tabular (so digits hold their box), and non-shrinking next to the title.
		badge: ['text-xs', 'leading-none', 'tabular-nums', 'shrink-0', text.muted],
	},
	reorder: {
		// Lift the actively dragged column above its neighbours and float it on its
		// own opaque surface so the columns it slides over stay hidden — without the
		// fill a transparent cell let their text bleed through, and the former
		// `opacity-70` softening could only dim that bleed, never stop it. The
		// z-index only bites where the cell is a positioned box — sticky headers
		// already are; `shift` promotes the rest for the duration of the drag — and
		// the shadow reads the lifted column as picked up off the table.
		cell: [
			'data-[dragging]:z-20',
			'data-[dragging]:shadow-lg',
			// The held column dims its text to the muted foreground — header and body
			// alike, since this class is shared — so the dragged column reads as
			// lifted/in transit and a Space/Enter keyboard lift, which moves nothing
			// until an arrow key, isn't left without a cue. Mirrors `iro.text.muted`;
			// the header already sits at this shade (table `header` base), so the
			// visible shift is the bright body (`text.default`) dimming to meet it.
			// `data-[dragging]` out-specifies the cell's resting colour, so the
			// override lands without `!`.
			'data-[dragging]:text-zinc-500',
			'dark:data-[dragging]:text-zinc-400',
			...draggingSurface,
		],
		// Promotes a non-sticky reorder cell to `relative` while dragging so its
		// lift z-index takes effect.
		shift: 'data-[dragging]:relative',
		// Keeps the grip, title, and any sort control on one baseline. A block-level
		// flex (not inline) fills the header width so the title between the grip and
		// the filter button can shrink to an ellipsis instead of overrunning the cell.
		layout: [flex.row, 'min-w-0', 'gap-1'],
		// The grabbing cursor follows the live drag (`data-[dragging]`), not the
		// pointer's `:active` state: a right-click presses the grip `<button>` into
		// `:active` too, and the context menu swallowing the matching pointerup
		// would leave that cursor stuck as if the column were still held.
		// `-ml-1.5` pulls the grip left by the GripVertical glyph's optical inset (its
		// dots sit a third of the way into the `size-5` box) so the visible grip lines
		// up over the column's cell values instead of floating a step to their right.
		// That pull seats the box flush to the table's horizontal scroll wrapper
		// (`overflow-x-auto`), so its focus ring is `inset` — clip-safe, like
		// `k.nav.cell` and the `k.resize.grip` colour shift — rather than the outset
		// `ring` the wrapper would shave at the edge.
		handle: [
			flex.inline,
			'shrink-0',
			'-ml-1.5',
			// Expand the 20px grip's hit area to >=24x24 (WCAG 2.5.8) via a centered
			// transparent `::before`, leaving the glyph and its `-ml` inset in place.
			'relative',
			"before:absolute before:-inset-1 before:content-['']",
			text.muted,
			fg.hover,
			focus.inset,
			'cursor-grab touch-none select-none data-[dragging]:cursor-grabbing',
		],
	},
	rowReorder: {
		// The row drag-handle cell: a narrow, centered column holding the grip,
		// sized to content like the selection cell.
		cell: 'w-px text-center align-middle [line-height:0]',
		// Grip button carrying the row's drag activator. Mirrors the column
		// reorder handle (`k.reorder.handle`): grab cursor tracking the live drag
		// (`data-[dragging]`, not `:active`, so a context-menu press doesn't strand
		// it), muted at rest and tinting on hover, an inset focus ring (clip-safe in
		// the scroll wrapper), and a centered transparent `::before` expanding the
		// 20px glyph's hit area to >=24x24 (WCAG 2.5.8). `touch-none` keeps a
		// touch-drag from scrolling the page instead of lifting the row.
		handle: {
			root: [
				flex.inline,
				'shrink-0',
				'relative',
				"before:absolute before:-inset-1 before:content-['']",
				text.muted,
				fg.hover,
				focus.inset,
				'cursor-grab touch-none select-none data-[dragging]:cursor-grabbing',
			],
			// The grip while reordering is unavailable — a column sort orders the rows,
			// or `rowReorder.disabled` is set: shown for layout stability but inert and
			// dimmed, so it reads as "not draggable now" rather than missing.
			disabled: [flex.inline, 'shrink-0', text.muted, 'opacity-50', 'cursor-not-allowed'],
		},
		// Lifts the actively dragged row above its siblings on an opaque surface
		// with a shadow, so the rows it slides over stay hidden behind it — a
		// transparent `<tr>` would let their content bleed through. Gated on the
		// `data-[dragging]` the row carries; the fill tracks the content host
		// across viewports (see `hostSurface`/`draggingSurface`).
		dragging: [
			'data-[dragging]:relative',
			'data-[dragging]:z-10',
			'data-[dragging]:shadow-lg',
			...draggingSurface,
		],
	},
	rowGroup: {
		// A 2px colored rail down the group's leading edge — carried by the leftmost
		// cell of every row in the group (its header and each leaf) so it reads as one
		// continuous bar, the row-group analog of a column group's underline rule. For
		// now it takes a neutral tint; a forthcoming row manager will swap in a
		// per-group palette colour. `rail` is the padded group cells' variant (the
		// leaf/header cells manage their own padding); `railBorder` is the border
		// alone, for the loading placeholder rows that keep ordinary cell padding.
		railBorder,
		rail: ['py-0', ...railBorder],
		// Chevron at the row's trailing edge: the group row renders a right chevron
		// when collapsed and a down chevron when expanded; `shrink-0` holds its size
		// beside the label.
		chevron: 'shrink-0',
		// The reveal wrapper inside each leaf cell: a one-row CSS grid whose track
		// tweens `1fr` (open) ↔ `0fr` (closed) via `data-open`, the modern auto-height
		// animation — reliable in a `<table>`, where a JS height tween on a `<td>` is
		// not. Transitions the track over 200ms, honouring `prefers-reduced-motion`.
		reveal: [
			'grid',
			'[grid-template-rows:0fr]',
			'data-[open]:[grid-template-rows:1fr]',
			'transition-[grid-template-rows]',
			'duration-200',
			'ease-in-out',
			'motion-reduce:transition-none',
		],
		// The clip between the grid track and the content: `min-h-0` lets the track
		// shrink past the content, `overflow-hidden` hides what the collapse clips.
		revealClip: ['overflow-hidden', 'min-h-0'],
		// Per-density cell padding on the reveal wrapper, mirroring kata/table's `density`
		// leaf padding (compact → p-1, snug → p-2, loose → p-3) so an animated leaf cell
		// matches an ordinary one — and collapses that padding to nothing at height 0.
		revealPad: defineRecipe({
			density: { compact: ['p-1'], snug: ['p-2'], loose: ['p-3'] },
			defaults: { density: 'snug' },
		}),
	},
	aggregate: {
		// Aggregated figures on group-header and total rows: firmer than the data
		// they summarize, tabular so they align down their columns.
		cell: ['tabular-nums', 'font-medium'],
		// The total row's leading "Total" label, matching the figures' weight.
		label: ['font-medium'],
	},
	detail: {
		// The master-detail chevron in an expander cell: rotates a quarter-turn as
		// the panel opens (`data-open`), honouring `prefers-reduced-motion`. Inline
		// flex so the rotate spins the icon about its own centre.
		chevron: [
			'inline-flex',
			'shrink-0',
			'transition-transform',
			'duration-200',
			'motion-reduce:transition-none',
			'data-[open]:rotate-90',
		],
		// The detail row's `<td>` reveal wrapper: the same one-row CSS grid the
		// group leaves ride (`1fr` ↔ `0fr` on `data-open`), so a panel grows and
		// shrinks to its content height over a transition without JS measurement.
		reveal: [
			'grid',
			'[grid-template-rows:0fr]',
			'data-[open]:[grid-template-rows:1fr]',
			'transition-[grid-template-rows]',
			'duration-200',
			'ease-in-out',
			'motion-reduce:transition-none',
		],
		// The clip between the reveal track and the panel body.
		revealClip: ['overflow-hidden', 'min-h-0'],
		// The panel's own inset, set off from the rows with a hairline top rule and
		// a faint recessed surface so it reads as a nested region, not another row.
		panel: [
			'p-3',
			'border-t-2',
			...mode('border-zinc-950/5 bg-zinc-50', 'dark:border-white/10 dark:bg-white/[0.02]'),
		],
	},
	resize: {
		// Fixed layout + a <colgroup> of exact widths so resizing one column
		// changes only that column (and the table's total width) instead of
		// redistributing across siblings; the table scrolls horizontally past its
		// container in the Table's own overflow wrapper.
		fixed: 'table-fixed',
		// Anchors the absolutely-positioned resize handle on a non-sticky header (a
		// sticky header already positions itself; a reordering header's shift
		// transform also forms a containing block, but `relative` keeps the anchor
		// explicit and shared by both). The handle lives in the header, so there is
		// no body-region overflow to lift over the column's cells.
		cell: 'relative',
		// Density-scaled resize metrics (header trailing padding + grab-zone width)
		// projected onto resizable headers; lives on the `<table>` element.
		metrics: resizeMetrics,
		// Resize grab zone on a resizable header's trailing edge, anchored to the
		// inside of that edge (`right-0`, no outward shift) and widening leftward into
		// the cell. Its width is density-scaled (set via `metrics`, since only the
		// table knows the density) to twice the cell's horizontal padding — 8/16/24px
		// across compact/snug/loose. It spans the header cell's height (`h-full`): the
		// affordance lives in the header, not down the column. `justify-center` lands
		// the grip one cell-padding in from the trailing edge — flush with where a
		// truncating header's label and body values clip — and `items-center` centres
		// the short grip vertically. `group/grid-resize` lets the grip tint on hover
		// and turn accent on focus or active drag. The grab zone does not overhang the
		// boundary: an outward overhang gets painted over by a neighbour's opaque
		// sticky/pinned header, and on the trailing column inflates the horizontal scroll.
		handle: [
			'group/grid-resize absolute top-0 right-0 z-10 h-full',
			'flex items-center justify-center',
			'cursor-col-resize touch-none select-none outline-none',
		],
		// Grip line — a short 2px rounded bar (`h-4`), its 2px width matching the
		// `ResizableHandle` grip (`kata/resizable`) so every resize affordance reads
		// the same, centred in the grab zone (`justify-center` on the handle) one
		// cell-padding in from the trailing edge. Always visible: muted at rest,
		// tinting on hover, turning accent on keyboard focus or active drag. Focus
		// shows as a colour change, not an outset ring, so the scroll container can't
		// clip it.
		grip: [
			'h-4 w-0.5',
			rounded.full,
			'transition-colors',
			...mode(
				'bg-zinc-300 group-hover/grid-resize:bg-zinc-400',
				'dark:bg-zinc-600 dark:group-hover/grid-resize:bg-zinc-500',
			),
			'group-focus-visible/grid-resize:bg-blue-500 dark:group-focus-visible/grid-resize:bg-blue-500',
			'group-data-[resizing]/grid-resize:bg-blue-500 dark:group-data-[resizing]/grid-resize:bg-blue-500',
		],
	},
	filter: {
		// Per-column filter row beneath the header.
		row: bg.surface,
		cell: ['px-2', 'py-1', 'align-middle'],
		// Header row: title on the left, filter button across from it on the right.
		slot: ['flex', 'items-center', 'justify-between', 'gap-1'],
		// Filter icon button in a column header: layout only. The active accent comes
		// from the Button's `color` prop; `idle` is the resting muted tint, dropped
		// when active so it doesn't override that colour.
		button: ['shrink-0'],
		idle: [text.muted, fg.hover],
		// Reset button in the filter sheet's footer: an auto right-margin pushes it
		// to the left edge, across from the right-justified Cancel / Apply pair.
		reset: 'mr-auto',
	},
	footer: {
		// Footer below the table, laid out as three zones. From `lg`: one row with
		// the page-size picker at the start, the page navigation centered, and the
		// row-range status at the end — each zone an equal `flex-1` track so the
		// navigation stays centered whatever the side content. Below `lg`: the
		// navigation sits on its own row up top, with the
		// picker and status sharing a justified-between row beneath it (the `meta`
		// wrapper collapses to `contents` at `lg` so all three become siblings of the
		// one row, reordered controls · nav · status).
		bar: ['flex', 'flex-col', 'gap-2', 'pt-2', 'lg:flex-row', 'lg:items-center'],
		// Page navigation: centered on its own row below `lg`, the centered middle
		// track from `lg`.
		nav: ['flex', 'justify-center', 'lg:order-2', 'lg:flex-1'],
		// Picker + status: a justified-between row below `lg`; dissolves into the
		// footer row from `lg` so the controls and status order independently around
		// the centered nav.
		meta: ['flex', 'items-center', 'justify-between', 'gap-3', 'lg:contents'],
		// Row-range status ("1–10 of 47"): the end track from `lg` (right-aligned),
		// the right of the justified row below it.
		status: [size.md, text.muted, 'whitespace-nowrap', 'lg:order-3', 'lg:flex-1', 'lg:text-right'],
		// Page-size picker: the start track from `lg` (left-aligned), the left of the
		// justified row below it. Always rendered so the track holds even when empty,
		// keeping the nav centered.
		controls: [flex.inline, 'items-center', 'gap-4', 'lg:order-1', 'lg:flex-1'],
	},
	// Condensed down-projections layered on the compact density the grid forwards
	// to `<Table>` when `condensed` is set. All cast from the `<table>` element
	// onto its descendants (like the table's own density/outline projections) so
	// cells and headers read no context and the family still renders in RSC. They
	// reach only what lives in the table's own DOM — a portaled overlay (context
	// menu, column-manager dialog) is out of scope and keeps the ambient density,
	// since `condensed` is a table-density preset, not a theme its overlays adopt.
	condensed: {
		// Step header + body cell text below the table's `text-base` base. The
		// selector targets the cell element, so a consumer cell that sets its own
		// size still overrides it. Tailwind scans whole literals — keep these in
		// step with the density padding rows above.
		font: ['[&>*>tr>td]:text-sm', '[&>*>tr>th]:text-sm'],
		// Step every icon in a header or body cell to the compact `size-4`: the
		// grid's own header chrome (sort arrow, pin, grip, filter) and a consumer's
		// `<Icon>` in a cell — standalone or inside a `<Badge>`, whose icon slot is
		// a nested `data-slot=icon`. A static `<Icon>` reads no density, so the
		// projection is the only lever that reaches it.
		icon: ['[&>*>tr>th_[data-slot=icon]]:size-4', '[&>*>tr>td_[data-slot=icon]]:size-4'],
		// Step a consumer `<Badge>` in a cell down one size. A `<Badge>` is a static
		// leaf that ignores the density cascade, so match the cell-font step on its
		// text (the dominant size cue; its icon slot rides the `icon` rule above).
		badge: '[&>*>tr>td_[data-slot=badge]]:text-sm',
	},
	// The opt-in summary footer (`GridFooter`) below the table: a small, muted
	// status bar. Wraps on narrow viewports; the leading slot holds a single count
	// (the selected total swaps in over the row total in place), and any custom
	// content is pushed to the far edge by `ml-auto` in the trailing cluster.
	summary: {
		bar: ['flex', 'flex-wrap', 'items-center', 'gap-x-4', 'gap-y-1', size.md, text.muted],
		trailing: ['flex', 'flex-wrap', 'items-center', 'gap-x-4', 'gap-y-1', 'ml-auto'],
		item: 'whitespace-nowrap',
	},
	row: {
		// A clickable row (`onRowClick`): the pointer cursor and a keyboard focus
		// ring (the row is a tab stop). Its hover wash is the shared `<Table hover>`
		// variant `GridData` enables for a row click. Interactive cell content
		// (buttons, the select checkbox) handles its own clicks; the row guard skips
		// those.
		clickable: ['cursor-pointer', focus.ring],
		loading: [css.pulse, 'opacity-50'],
	},
	nav: {
		// The `navigable` grid's `<table>` is the cursor's single tab stop; drop its
		// own focus outline so the active-cell ring is the sole, precise indicator.
		table: 'outline-0',
		// Active-cell cursor ring for a `navigable` read-only grid, driven by the
		// `data-active` the cell marker toggles onto the owning `role="gridcell"`
		// <td>. Inset so the scroll container can't clip it; accent blue, matching
		// the editable grid's active cell.
		cell: [
			'data-[active]:ring-2',
			'data-[active]:ring-inset',
			...mode('data-[active]:ring-blue-600', 'dark:data-[active]:ring-blue-500'),
		],
	},
	// Inline per-row editing: an editable row's cells render their editors (the
	// grid's own Input / NumberInput / Listbox, or a column `editCell` slot) with
	// their normal styling, sitting inside the cell padding — the editing row just
	// grows to fit the controls.
	edit: {
		// Host for a cell's editor; anchors the absolute validation message.
		host: 'relative flex w-full items-center',
		// The in-cell control fills the cell width.
		input: 'w-full',
		// A failed validation rings the editor and anchors a small message below it.
		errorRing: ['ring-2 ring-inset', ...mode('ring-red-600', 'dark:ring-red-500'), 'rounded-md'],
		error: [
			'absolute top-full left-0 z-20 mt-0.5 max-w-xs',
			'rounded px-1.5 py-0.5 text-xs whitespace-normal',
			'text-white shadow',
			...mode('bg-red-600', 'dark:bg-red-500'),
		],
	},
} as const
