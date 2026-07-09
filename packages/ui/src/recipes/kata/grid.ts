/**
 * Data-table kata: object-literal surface for the table chrome that sits
 * around `kata/table` — sticky head, batch-action bar, sort controls, column
 * drag-reorder, and the row-loading pulse. No top-level variants axis; the only
 * sub-recipe is the `sort.icon`, inked or muted by whether its column is the
 * active sort.
 */
import { defineRecipe, mode, type PaletteColor } from '../../core/recipe'
import { hannou, iro, ji, kasane, narabi, omote, sen, ugoki } from '../kiso'

const { cursor, fg } = hannou
const { text } = iro
const { size, weight } = ji
const { rounded } = kasane
const { flex } = narabi
const { bg } = omote
const { border, focus } = sen
const { css, spring } = ugoki

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
 *
 * The neutral is a *left-side* border color (`border-l-<neutral>`), not the
 * all-sides `border-color` — so when {@link railColor} layers a palette color on
 * the same cell they land in one tailwind-merge group (`border-left-color`) and
 * the color cleanly replaces the neutral, in both light and dark, without an
 * `!important`. (An all-sides neutral would sit in a different group and survive
 * the merge, and its `dark:` variant — one extra class under class-based dark
 * mode — would then outrank the un-variant color and win in dark mode.)
 */
const railBorder = ['border-l-2', ...mode('border-l-zinc-950/5', 'dark:border-l-white/10')]

/**
 * A colored group rail, keyed by {@link PaletteColor} so a group reads
 * `railColor[group.color]`. Swaps the neutral {@link railBorder} tint for the
 * group's palette hue at the solid `-600` shade — matching a column group's
 * `bandColor` underline — when the row manager assigns one. Left-side-specific
 * (`border-l-<color>`) with a matching `dark:` variant, so it shares the neutral
 * rail's tailwind-merge group *and* variants and replaces it outright (no
 * `!important`, no dark-mode fallthrough). Full literals for Tailwind's scanner.
 */
const railColor: Record<PaletteColor, string> = {
	zinc: 'border-l-2 border-l-zinc-600 dark:border-l-zinc-600',
	red: 'border-l-2 border-l-red-600 dark:border-l-red-600',
	amber: 'border-l-2 border-l-amber-600 dark:border-l-amber-600',
	green: 'border-l-2 border-l-green-600 dark:border-l-green-600',
	blue: 'border-l-2 border-l-blue-600 dark:border-l-blue-600',
	rose: 'border-l-2 border-l-rose-600 dark:border-l-rose-600',
	violet: 'border-l-2 border-l-violet-600 dark:border-l-violet-600',
	sky: 'border-l-2 border-l-sky-600 dark:border-l-sky-600',
}

/**
 * A group's aggregation / total-footer tint, keyed by {@link PaletteColor} so a
 * cell reads `rowGroupTint[group.color]`. A low-opacity fill of the group's hue
 * (`/10`), so the summarizing figures sit on a faint wash of the group color
 * while staying legible over both surfaces. Full literals for Tailwind's scanner.
 */
const rowGroupTint: Record<PaletteColor, string> = {
	zinc: 'bg-zinc-500/10',
	red: 'bg-red-500/10',
	amber: 'bg-amber-500/10',
	green: 'bg-green-500/10',
	blue: 'bg-blue-500/10',
	rose: 'bg-rose-500/10',
	violet: 'bg-violet-500/10',
	sky: 'bg-sky-500/10',
}

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
	// `maxHeight="fill"`: the grid takes its parent's box instead of a fixed cap —
	// the wrapper stretches to the parent's height and the scroll region flexes to
	// the remainder under the toolbar/footer (`min-h-0` lets each shrink below its
	// content, which a flex child otherwise refuses), so the windowed scroll
	// container binds inside any CSS-sized parent.
	fill: {
		wrapper: 'h-full min-h-0',
		scroll: 'min-h-0 flex-1',
	},
	sticky: {
		// `scrollbar-gutter: stable` reserves the scrollbar's track up front, so the
		// bar appearing on the first overflow (an infinite-scroll viewport-fill, a
		// grown row set) doesn't shrink the content width and reflow every column.
		wrapper: 'overflow-auto [scrollbar-gutter:stable] [&>[data-slot=table]]:!overflow-visible',
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
		border: {
			right: [
				"after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-0.5 after:content-['']",
				'after:bg-zinc-950/10',
				'dark:after:bg-white/10',
			],
			left: [
				"after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-0.5 after:content-['']",
				'after:bg-zinc-950/10',
				'dark:after:bg-white/10',
			],
		},
		// Separating shadow at a frozen group's inner edge, cast toward the scroll.
		edge: {
			left: ['shadow-[1px_0_3px_rgba(0,0,0,0.08)]', 'dark:shadow-[1px_0_3px_rgba(0,0,0,0.5)]'],
			right: ['shadow-[-1px_0_3px_rgba(0,0,0,0.08)]', 'dark:shadow-[-1px_0_3px_rgba(0,0,0,0.5)]'],
		},
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
	// Group-by icon button in a column header (see `GridGroupByButton`): press to
	// group the rows by the column, press again to ungroup.
	groupButton: {
		// Layout only. The active accent (this column is the group) comes from the
		// Button's `color` prop; `idle` is the resting muted tint, dropped when
		// active so it doesn't override that colour — mirroring the filter button.
		button: ['shrink-0'],
		idle: [text.muted, fg.hover],
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
	cell: {
		// Utility columns sized to their content: the selection checkbox, the
		// row-actions cluster, and the master-detail expander. `w-px` shrinks each
		// to its content against the auto-width data columns.
		select: 'w-px text-center align-middle [line-height:0]',
		actions: 'w-px whitespace-nowrap',
		expander: 'w-px text-center align-middle [line-height:0]',
		// One-line cell content that truncates to an ellipsis at the column width.
		// `block` gives the span the cell's width so the fixed/auto column bounds it.
		truncate: ['block', 'truncate'],
		// Truncation tooltip surface: cap the width and let long text wrap inside.
		tooltip: ['max-w-xs', 'whitespace-normal', 'break-words'],
		// A roving-focusable data cell (`onCellClick`/`onCellDoubleClick`): the
		// pointer cursor and a keyboard focus ring. `inset` like `k.nav.cell` and
		// `k.row.clickable`, so the horizontal scroll wrapper can't shave it at the
		// row's leading/trailing edge.
		rovable: ['cursor-pointer', focus.inset],
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
		// The trailing pair holds the title at the muted shade on hover while a column
		// drag lifts and mutes this header (an ancestor carrying `data-dragging`) —
		// otherwise `fg.hover` would brighten the held column's own title under the
		// dragging pointer, fighting the dim cue. The `hover:not-disabled` modifiers
		// mirror `fg.hover`, and the `[data-dragging]` ancestor adds the specificity
		// that outranks it, so the hold lands without `!`. Inert on any header with no
		// dragging ancestor — every non-reorder header, and a reorder header at rest.
		button: [
			flex.inline,
			'min-w-0',
			text.muted,
			fg.hover,
			focus.ring,
			cursor,
			'select-none',
			'[[data-dragging]_&]:hover:not-disabled:text-zinc-500',
			'dark:[[data-dragging]_&]:hover:not-disabled:text-zinc-400',
		],
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
		// Whole-header drag handle (`reorder.handle: false`): the header cell itself
		// carries the grab cursor — grabbing while lifted (`data-[dragging]`, the same
		// live-drag flag the grip uses, not `:active`, so a context-menu press doesn't
		// strand it) — and suppresses text selection and touch-scroll so a press
		// anywhere on the header lifts the column. A sortable column's sort control
		// keeps `cursor-pointer`: set on the control itself, it out-resolves this
		// inherited grab cursor on that child.
		grab: ['cursor-grab', 'touch-none', 'select-none', 'data-[dragging]:cursor-grabbing'],
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
		// continuous bar, the row-group analog of a column group's underline rule. It
		// takes a neutral tint by default; the row manager swaps in a per-group
		// palette colour (`rail.color[group.color]`).
		rail: {
			// The padded group cells' variant (the leaf/header cells manage their own padding).
			padded: ['py-0', ...railBorder],
			// The border alone, for the loading placeholder rows that keep ordinary cell padding.
			border: railBorder,
			// Per-group rail color (see {@link railColor}) — the manager's palette hue,
			// replacing the neutral `border` tint on the leading cell of every group row.
			color: railColor,
		},
		// The group's aggregation / total-footer color wash (see {@link rowGroupTint}).
		tint: rowGroupTint,
		// Chevron at the row's trailing edge: the group row renders a right chevron
		// when collapsed and a down chevron when expanded; `shrink-0` holds its size
		// beside the label.
		chevron: 'shrink-0',
		// The reveal wrapper inside each leaf cell: a one-row CSS grid whose `track`
		// tweens `1fr` (open) ↔ `0fr` (closed) via `data-open`, the modern auto-height
		// animation — reliable in a `<table>`, where a JS height tween on a `<td>` is not.
		reveal: {
			// Transitions the track over 200ms, honouring `prefers-reduced-motion`.
			track: [
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
			clip: ['overflow-hidden', 'min-h-0'],
			// Per-density cell padding on the reveal wrapper, mirroring kata/table's `density`
			// leaf padding (compact → p-1, snug → p-2, loose → p-3) so an animated leaf cell
			// matches an ordinary one — and collapses that padding to nothing at height 0.
			pad: defineRecipe({
				density: { compact: ['p-1'], snug: ['p-2'], loose: ['p-3'] },
				defaults: { density: 'snug' },
			}),
		},
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
		// the panel opens (`data-open`), honouring `prefers-reduced-motion`. The
		// class rides the chevron `<svg>` directly (the expander passes `data-open`
		// and this recipe onto the lucide element), which rotates about its own
		// centre without a wrapper.
		chevron: [
			'shrink-0',
			'transition-transform',
			'duration-200',
			'motion-reduce:transition-none',
			'data-[open]:rotate-90',
		],
		// The detail row's `<td>` reveal wrapper: the same one-row CSS grid the
		// group leaves ride (`1fr` ↔ `0fr` on `data-open`), so a panel grows and
		// shrinks to its content height over a transition without JS measurement.
		reveal: {
			track: [
				'grid',
				'[grid-template-rows:0fr]',
				'data-[open]:[grid-template-rows:1fr]',
				'transition-[grid-template-rows]',
				'duration-200',
				'ease-in-out',
				'motion-reduce:transition-none',
			],
			// The clip between the reveal track and the panel body.
			clip: ['overflow-hidden', 'min-h-0'],
		},
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
		// ring (the row is a roving tab stop). The ring is `inset` — clip-safe, like
		// `k.nav.cell` and the reorder grip — since the grid's horizontal scroll
		// wrapper (`overflow-x-auto`) shaves the outset `ring`'s offset stroke at the
		// row's leading/trailing edge. Its hover wash is the shared `<Table hover>`
		// variant `GridData` enables for a row click. Interactive cell content
		// (buttons, the select checkbox) handles its own clicks; the row guard skips
		// those.
		clickable: ['cursor-pointer', focus.inset],
		loading: [css.pulse, 'opacity-50'],
	},
	// Framer transition configs (spread/passed to a `motion` element, never to
	// `cn`). Unlike the CSS `grid-template-rows` reveals the group and detail rows
	// use, a sort reflow moves whole rows between slots — a FLIP `layout` animation,
	// which only a real `motion.tr` can drive.
	motion: {
		// Layout transition for the sort row reflow: on a sort, each stable-keyed
		// row FLIPs from its old place to its new one on the shared `layoutId`
		// spring (snappy, lightly damped — settles fast without a bounce). Reduced
		// motion stands the whole animation down upstream, so no `duration: 0` branch
		// is needed here.
		rowSort: { layout: spring },
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
