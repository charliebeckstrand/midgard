/**
 * Data-table kata: the sheet of the table chrome around `kata/table`. It styles
 * the sticky head, the toolbar, the sort controls, the column and row
 * drag-reorder, and the row-loading pulse. It is a plain object of class lists
 * and not a unit, because many files of the grid read it, and a cell reads its
 * classes with no call. The `resize.metrics` and `row.group.reveal.pad` classes
 * are stepped.
 */
import { mode, type PaletteColor } from '../../core/recipe'
import { dan, hannou, iro, ji, kasane, narabi, omote, sen, ugoki } from '../kiso'

const { busy, cursor, fg, grab } = hannou
const { text } = iro
const { size, weight } = ji
const { rounded } = kasane
const { flex } = narabi
const { backdrop, popover } = omote
const { focus, ring } = sen
const { instant, spring } = ugoki

/**
 * The trailing padding (`pe-*`, the inline end) of each resizable header (a
 * header with `data-resizable`), so that its label clears the resize handle.
 * The table projects it onto the headers, so it overrides the density cell
 * padding at a higher specificity, with no `!important`. It is a stepped
 * class, so it takes the step of the nearest density scope, as the cell
 * padding does.
 *
 * The padding and the width of the handle (see `handle`) use the same ramp,
 * which is twice the horizontal cell padding of the density (`px-1`/`px-2`/
 * `px-3` → 4/8/12px). The handle sits on the trailing edge, so its centered
 * grip lands one cell padding in from that edge. The header label and the body
 * values truncate at that line, so the grip meets the value and does not cut
 * through it.
 */
const resizeMetrics = [dan.space.resize.end]

/**
 * Opaque fill behind every sticky grid surface: the sticky header bar and the
 * frozen header/body cells alike. The rows and columns scrolling under them
 * therefore stay hidden. The fill must match the surface under the grid, or the
 * sticky cells show as a box of a different shade.
 *
 * It reads `--surface-fill`, which `omote.bg.surface` sets on a surface card and
 * on a flat dialog, sheet, or drawer. A dashboard tile is a surface card. With
 * no such surface around it, the grid sits on the content host of the sidebar
 * layout (`omote.content`), which sets the fill of its flat or card value. The
 * sticky headers of the layout read the same fill. With no host at all, the
 * grid takes the page ground.
 */
const hostSurface = mode(
	'bg-(--surface-fill,var(--color-white))',
	'dark:bg-(--surface-fill,var(--color-zinc-950))',
)

/**
 * Opaque fill the actively dragged reorder column paints while lifted, so the
 * sibling columns it slides over stay hidden behind it. A transparent `<th>` /
 * `<td>` let their text bleed through, and `opacity` could only soften, never
 * stop, that bleed. It reads the same surface fill as {@link hostSurface}, the
 * table's own effective background. The lifted column therefore reads as a solid
 * slice of the table rather than a shade-off box. It is gated on the
 * `data-[dragging]` state the dragged column's cells carry.
 */
const draggingSurface = mode(
	'data-dragging:bg-(--surface-fill,var(--color-white))',
	'dark:data-dragging:bg-(--surface-fill,var(--color-zinc-950))',
)

/**
 * The 2px rule at the boundary of a frozen group: a full-height `::after` on
 * the boundary cell, which stays with the sticky cell (see `pinned.border`).
 * Forced colors remove the fill, so the rule paints the `shape` of `sen.forced`
 * on the `::after`.
 */
const pinnedRule = [
	"after:pointer-events-none after:absolute after:inset-y-0 after:w-0.5 after:content-['']",
	...mode('after:bg-zinc-950/10', 'dark:after:bg-white/10'),
	'forced-colors:after:bg-[CanvasText]',
]

/**
 * The group rail's 2px neutral inline-start border: a continuous bar down the
 * group's leading edge. The side is logical, so a right-to-left grid draws it on
 * the right. The group header cells, the leaf and total cells, and the
 * loading placeholder rows all carry it, so the rail runs unbroken while a
 * group's children load. It sets no padding: a header cell keeps the ordinary
 * cell padding, so a header row has the height of a data row.
 *
 * The neutral is an *inline-start* border color (`border-s-<neutral>`), not the
 * all-sides `border-color`. When {@link railColor} layers a palette color on
 * the same cell they land in one tailwind-merge group (`border-color-s`).
 * The color then cleanly replaces the neutral, in both light and dark, without
 * an `!important`. (An all-sides neutral would sit in a different group and
 * survive the merge. Its `dark:` variant (one extra class under class-based
 * dark mode) would then outrank the un-variant color and win in dark mode.)
 */
const railBorder = ['border-s-2', ...mode('border-s-zinc-950/5', 'dark:border-s-white/10')]

/**
 * A colored group rail, keyed by {@link PaletteColor} so a group reads
 * `row.group.rail.color[group.color]`. Swaps the neutral {@link railBorder} tint
 * for the group's palette hue at the solid `-600` shade, when the row manager
 * assigns one. That shade matches the underline of a column group (`rule.color`
 * in `kata/grid-group`).
 * Inline-start-specific (`border-s-<color>`) with a matching `dark:` variant, so it
 * shares the neutral rail's tailwind-merge group *and* variants. It replaces the
 * neutral outright (no `!important`, no dark-mode fallthrough). Full literals
 * for Tailwind's scanner.
 */
const railColor: Record<PaletteColor, string> = {
	zinc: 'border-s-2 border-s-zinc-600 dark:border-s-zinc-600',
	red: 'border-s-2 border-s-red-600 dark:border-s-red-600',
	amber: 'border-s-2 border-s-amber-600 dark:border-s-amber-600',
	green: 'border-s-2 border-s-green-600 dark:border-s-green-600',
	blue: 'border-s-2 border-s-blue-600 dark:border-s-blue-600',
	rose: 'border-s-2 border-s-rose-600 dark:border-s-rose-600',
	violet: 'border-s-2 border-s-violet-600 dark:border-s-violet-600',
	sky: 'border-s-2 border-s-sky-600 dark:border-s-sky-600',
}

/**
 * A utility column that takes the width of its content, with the content in
 * the center: the selection checkbox, the detail expander, and the row grip.
 * `w-px` shrinks the column against the auto-width data columns.
 */
const fitCell = 'w-px text-center align-middle leading-0'

/**
 * A reveal wrapper: a one-row CSS grid whose `track` tweens `1fr` (open) and
 * `0fr` (closed) on `data-open`. The content grows and shrinks to its height
 * with no JS measurement, which is reliable in a `<table>`, where a JS height
 * tween on a `<td>` is not. The track honors `prefers-reduced-motion`. The
 * `clip` sits between the track and the content: `min-h-0` lets the track
 * shrink past the content, and `overflow-hidden` hides what the collapse clips.
 */
const reveal = {
	track: [
		'grid',
		'grid-rows-[0fr]',
		'data-open:grid-rows-[1fr]',
		'transition-[grid-template-rows]',
		'duration-200',
		'ease-in-out',
		'motion-reduce:transition-none',
	],
	clip: ['overflow-hidden', 'min-h-0'],
}

/**
 * An icon button in a column header, for layout only. The Button's `color`
 * prop gives the active accent. `idle` is the muted tint at rest, which the
 * button drops while it is active, so the tint does not override that color.
 */
const headerButton = {
	base: ['shrink-0'],
	idle: [text.muted, fg.hover],
}

/**
 * The hit area of a 20px header or row control, grown to 24x24 (WCAG 2.5.8)
 * by a centered, transparent `::before`. The box does not grow, so the glyph
 * and its optical `-ms` inset stay where they are.
 */
const hit = ['relative', "before:absolute before:-inset-1 before:content-['']"]

/**
 * A reorder grip, for a column or a row. The grab cursor follows the live drag
 * (`data-[dragging]`). The grip is muted at rest and tints on hover. Its focus
 * ring is `inset`, because the horizontal scroll wrapper of the table clips an
 * outset ring at its edge.
 */
const grip = [flex.inline, 'shrink-0', ...hit, text.muted, fg.hover, focus.inset, ...grab.default]

export const k = {
	wrapper: {
		// `isolate` scopes the grid's internal sticky/pinned z-indices to its own
		// stacking context: the frozen header rides `z-20` and the sticky header
		// `z-10`, which must layer among themselves but must not leak out to overlap
		// a host's sticky chrome. An example is a SidebarLayout's own `z-20` page
		// header the grid scrolls beneath (without isolation the grid's later-in-DOM
		// `z-20` frozen header wins the tie and paints over it). Portaled surfaces
		// (the column-manager dialog, context menus, tooltips) render at the body,
		// outside this context, so they still overlay the page.
		base: ['relative', 'isolate', flex.col, dan.gap.scale.sm],
		// `maxHeight="fill"`: the grid takes its parent's box instead of a fixed cap.
		// The wrapper stretches to the parent's height, and the scroll region
		// (`sticky.wrapper.fill`) flexes to the remainder under the toolbar/footer.
		// `min-h-0` lets each shrink below its content, which a flex child otherwise
		// refuses, so the windowed scroll container binds inside any CSS-sized parent.
		fill: 'h-full min-h-0',
	},
	sticky: {
		// The scroll container of the table.
		wrapper: {
			// `scrollbar-gutter: stable` reserves the scrollbar's track up front, so the
			// bar appearing on the first overflow (an infinite-scroll viewport-fill, a
			// grown row set) doesn't shrink the content width and reflow every column.
			base: 'overflow-auto scrollbar-gutter-stable',
			// The scroller of a windowed master-detail or grouped body. The start anchor
			// of the window holds the rows in view, so the native scroll anchor stands
			// down (see `useGridItemWindow`).
			windowed: '[overflow-anchor:none]',
			// Under `maxHeight="fill"`, the scroll region flexes to the height that the
			// toolbar and the footer leave (see `wrapper.fill`).
			fill: 'min-h-0 flex-1',
		},
		// Sticky header bar: an opaque fill so body rows tuck under it on a vertical
		// scroll. The fill matches the surface under the grid (see `hostSurface`): a
		// card or dialog that holds the grid, else the content host.
		head: ['sticky top-0 z-10', hostSurface],
		// The column row below a column-group band. Its cells stick at the band
		// height, which the grid measures into `--grid-band-height` on the `<thead>`.
		// The band sticks at the top edge, so the two rows stack and do not overlap.
		// The row selector outranks the `top-0` of each cell, and a pinned cell
		// keeps its inline-start or inline-end offset.
		stack: '[&>th]:top-(--grid-band-height)',
	},
	pinned: {
		// Frozen data cell: opaque surface so the scrolling columns don't show
		// through, lifted just above the center cells (below the z-10 sticky head,
		// so a vertical scroll still tucks pinned cells under it). The fill matches
		// the surface under the grid (see `hostSurface`); the inline-start or
		// inline-end offset is an inline style summed from the engine.
		cell: ['sticky z-[1]', hostSurface],
		// Frozen header cell: above the sticky head so the top corner stays on top.
		// Shares the sticky header's fill (see `hostSurface`), so the pinned header
		// and the header bar paint one color.
		head: ['sticky z-20', hostSurface],
		// Edge border on a frozen group's scroll-facing boundary: a 2px rule at the
		// inline end of a start (left) group's innermost column, and at the inline
		// start of an end (right) group's. The edges are logical, so a right-to-left
		// grid mirrors them. Only that boundary column carries it (see
		// `pinnedClassName`), so a stack of pinned and/or locked columns shows one
		// rule, not one per column. Drawn as an `::after` overlay, not a CSS
		// `border`: the table collapses borders (`border-collapse: collapse`), so a
		// real cell border joins the table grid and scrolls away with the overflow
		// instead of staying on the frozen column. The overlay rides the sticky cell
		// and holds: the same reason the edge cue below is a box-shadow.
		// `inset-y-0`/`w-0.5` make a 2px full-height rule at the inner edge;
		// `pointer-events-none` keeps it inert.
		border: {
			end: [...pinnedRule, 'after:end-0'],
			start: [...pinnedRule, 'after:start-0'],
		},
		// Separating shadow at a frozen group's inner edge, cast toward the scroll.
		// A box-shadow offset is physical, so the `rtl:` forms mirror it.
		edge: {
			start: [
				'shadow-[1px_0_3px_rgba(0,0,0,0.08)]',
				'dark:shadow-[1px_0_3px_rgba(0,0,0,0.5)]',
				'rtl:shadow-[-1px_0_3px_rgba(0,0,0,0.08)]',
				'dark:rtl:shadow-[-1px_0_3px_rgba(0,0,0,0.5)]',
			],
			end: [
				'shadow-[-1px_0_3px_rgba(0,0,0,0.08)]',
				'dark:shadow-[-1px_0_3px_rgba(0,0,0,0.5)]',
				'rtl:shadow-[1px_0_3px_rgba(0,0,0,0.08)]',
				'dark:rtl:shadow-[1px_0_3px_rgba(0,0,0,0.5)]',
			],
		},
	},
	// The `outline` variant's cell borders, drawn in `border-collapse: separate`
	// mode so every rule rides its own cell instead of the collapsed table grid.
	// Collapsed borders weld to the table, not the cell: a sticky header or frozen
	// column keeps its content and fill pinned but leaves its collapsed borders
	// behind on the scrolling table, so a 1px seam opens above the header and a
	// frozen column's leading rule shifts as the border collapses in and out at the
	// scroll edges. Separate borders stay on the cell, so the sticky/frozen frame
	// holds. The grid applies this in place of `kata/table`'s collapse-mode
	// `projection.outline`, which it stops forwarding to `<Table>` when outlined.
	//
	// `border-spacing-0` keeps the cells flush. To avoid doubling every interior
	// line, each cell draws only its inline-end and bottom rule; the two open outer
	// edges close with a top rule on the first header row (riding the sticky header)
	// and an inline-start rule on each row's first cell (riding a frozen leading
	// column). The sides are logical, so a right-to-left grid mirrors them. All cast
	// from the `<table>` onto its descendants (like the table's own outline), so
	// cells read no context and render in RSC. Full literals for Tailwind's scanner;
	// keep the subtle tint in step with `kata/table`'s `projection.outline`.
	outline: {
		// Border model: separate, flush cells.
		table: ['border-separate', 'border-spacing-0'],
		// Interior gridlines plus the inline-end/bottom outer edges: every cell. The
		// tint is an all-sides `border-color`; only the sided widths below render it,
		// so the top/inline-start rules inherit the same color without repeating it.
		cell: [
			'[&>*>tr>:is(td,th)]:border-e',
			'[&>*>tr>:is(td,th)]:border-b',
			'[&>*>tr>:is(td,th)]:border-zinc-950/5',
			'dark:[&>*>tr>:is(td,th)]:border-white/5',
			'contrast-more:[&>*>tr>:is(td,th)]:border-zinc-950/50',
			'dark:contrast-more:[&>*>tr>:is(td,th)]:border-white/50',
		],
		// Top outer edge: the first header row, riding the sticky header.
		top: ['[&>thead>tr:first-child>th]:border-t'],
		// Inline-start outer edge: each row's first cell, riding a frozen leading
		// column.
		start: ['[&>*>tr>*:first-child]:border-s'],
	},
	// The toolbar region above the table (see `GridToolbar`, the single home for
	// the grid's above-table controls). A vertical stack of the top control row and,
	// while a row is selected, the batch-action row beneath it.
	toolbar: {
		// The toolbar is its own size container, as the footer is. The top row then
		// follows the width that the grid has (a dashboard tile, a dialog, a page),
		// not the viewport.
		base: ['@container', flex.col, dan.gap.scale.sm],
		// Top row: the quick-search field at the start, the column-manager trigger at
		// the end. Stacks in a narrow grid, then lays out as a row from `@lg`.
		bar: [flex.col, dan.gap.scale.sm, '@lg:flex-row', '@lg:items-center'],
		// Column-manager cluster: pushed to the row's end from `@lg` so it sits
		// across from the search field. The toolbar applies it only when no consumer
		// content renders, because two auto margins in one row share the free space.
		actions: '@lg:ms-auto',
		// The consumer's own content, pushed to the end the same way. It sits ahead
		// of the tools, so with both present the free space opens once (here) and
		// the two clusters stay together at the row's end.
		content: '@lg:ms-auto',
	},
	// Group-by icon button in a column header (see `GridGroupByButton`): press to
	// group the rows by the column, press again to ungroup.
	group: headerButton,
	cell: {
		// Utility columns sized to their content: the selection checkbox, the
		// row-actions cluster, and the master-detail expander. `w-px` shrinks each
		// to its content against the auto-width data columns.
		select: fitCell,
		actions: 'w-px whitespace-nowrap',
		expander: fitCell,
		// The box around the content of a utility cell. It is `max-content` wide at any
		// column width, so the autosizer reads the content width from it and sizes the
		// column to that. `centered` holds the content in the middle of a wider column,
		// as `text-center` does for the selection, expander, and grip cells.
		fit: {
			base: ['block', 'w-max'],
			centered: ['block', 'w-max', 'mx-auto'],
		},
		// One-line cell content that truncates to an ellipsis at the column width.
		// `block` gives the span the cell's width so the fixed/auto column bounds it.
		truncate: ['block', 'truncate'],
		// The same span while it holds an open editor. A span that clips is a
		// scroll container. The validation message shows below the cell, and its
		// scroll into view then scrolls the span and clips the editor. This form
		// lets the content overflow and keeps the one line.
		editing: ['block', 'whitespace-nowrap'],
		// The search-highlight wash behind a matched substring when `search.mode`
		// is `'highlight'` (mark, don't prune). The same mode-aware amber the JsonTree's
		// search highlight uses (`kata/json-tree` `highlight`), so a match reads the
		// same across the system. `text-inherit` drops the browser's default
		// yellow/black <mark> ink, and the wash carries no box metrics, so the marked
		// run's width matches the plain text and the column autosizer still measures
		// the intrinsic content width.
		mark: [...mode('bg-amber-100/60', 'dark:bg-amber-500/15'), rounded.sm, 'text-inherit'],
		// Truncation tooltip surface: cap the width and let long text wrap inside.
		tooltip: ['max-w-xs', 'whitespace-normal', 'wrap-break-word'],
		// A roving-focusable data cell (`onCellClick`/`onCellDoubleClick`): the
		// pointer cursor and a keyboard focus ring. `inset` like `k.nav.cell` and
		// `k.row.clickable`, so the horizontal scroll wrapper can't shave it at the
		// row's leading/trailing edge.
		rovable: ['cursor-pointer', focus.inset],
	},
	head: {
		// One-line header title that truncates to an ellipsis when it outgrows the
		// column. `min-w-0` overrides the flex item's `min-width: auto` so it shrinks
		// within the header's flex slot (and, for a sortable column, within the sort
		// button) instead of pushing past the cell into its neighbor.
		title: ['block', 'truncate', 'min-w-0'],
		// A frozen column's header affordances: the pin button paired with the title.
		pinned: {
			// Leading group pairing a pinned column's pin button with its title. `min-w-0`
			// keeps the title shrinkable so it still truncates beside the button; the `xs`
			// gap sets the button-to-title spacing.
			label: [flex.inline, 'min-w-0', dan.gap.scale.xs],
			// Pin button on a frozen column's header: an icon-only control that
			// unpins the column. Muted at rest, tinting on hover/focus so it reads as
			// the actionable affordance it is. `-ms-1` pulls the button toward the
			// inline start by the Pin glyph's optical inset, so the visible pin lands
			// over the column's cell values rather than a step past their start. The
			// Pin's leading ink sits ~4px into its `size-5` box (x=5 of lucide's
			// 24-unit grid, scaled by 20/24), shallower than the grip's dots at x=8,
			// so it takes a smaller pull than the grip's `-ms-1.5`; a shared value
			// would over-pull one glyph or the other. That pull seats the box flush
			// to the table's horizontal scroll wrapper (`overflow-x-auto`, see
			// `components/table`), which clips an outset outline at its edge; the
			// focus ring is therefore `inset`: clip-safe, like `k.nav.cell` and
			// unlike the inboard `k.sort.button`, whose outset `ring` clears the
			// edge. The 20px glyph is below the 24x24 minimum target (WCAG 2.5.8). A
			// centered, transparent `::before` expands the *hit* area to >=24x24
			// without moving the glyph (so the optical `-ms` alignment and inset ring
			// are untouched): growing the box itself would re-center the icon off
			// that tuned inset.
			button: [
				flex.inline,
				'shrink-0',
				'-ms-1',
				...hit,
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
		// drag lifts and mutes this header (an ancestor carrying `data-[dragging]`);
		// otherwise `fg.hover` would brighten the held column's own title under the
		// dragging pointer, fighting the dim cue. The `hover:not-disabled` modifiers
		// mirror `fg.hover`, and the `[data-dragging]` ancestor adds the specificity
		// that outranks it, so the hold lands without `!`. Inert on any header with no
		// dragging ancestor: every non-reorder header, and a reorder header at rest.
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
		// The sort arrow, which shows only on the column of the active sort. It keeps
		// its size while the title beside it truncates.
		icon: [text.default, 'shrink-0'],
		// Priority number beside the arrow under a multi-column sort: small, muted,
		// tabular (so digits hold their box), and non-shrinking next to the title.
		badge: [size.xs, 'leading-none', 'tabular-nums', 'shrink-0', text.muted],
	},
	reorder: {
		// Lift the actively dragged column above its neighbors and float it on its
		// own opaque surface so the columns it slides over stay hidden. Without the
		// fill, a transparent cell let their text bleed through, and the former
		// `opacity-70` softening could only dim that bleed, never stop it. The
		// z-index only bites where the cell is a positioned box (sticky headers
		// already are; `shift` promotes the rest for the duration of the drag) and
		// the shadow reads the lifted column as picked up off the table.
		cell: {
			base: [
				'data-dragging:z-20',
				'data-dragging:shadow-lg',
				// The held column dims its text to the muted foreground (header and body
				// alike, since this class is shared), so the dragged column reads as
				// lifted/in transit and a Space/Enter keyboard lift, which moves nothing
				// until an arrow key, isn't left without a cue. Mirrors `iro.text.muted`;
				// the header already sits at this shade (table `header` base), so the
				// visible shift is the bright body (`text.default`) dimming to meet it.
				// `data-[dragging]` out-specifies the cell's resting color, so the
				// override lands without `!`.
				'data-dragging:text-zinc-500',
				'dark:data-dragging:text-zinc-400',
				...draggingSurface,
			],
			// Promotes a non-sticky reorder cell to `relative` while dragging so its
			// lift z-index takes effect.
			shift: 'data-dragging:relative',
			// Whole-header drag handle (`reorder.handle: false`): the header cell
			// itself carries the grab cursor, and suppresses text selection and
			// touch-scroll so a press anywhere on the header lifts the column. The
			// cursor turns to grabbing while lifted (`data-[dragging]`, the same
			// live-drag flag the grip uses, not `:active`, so a context-menu press
			// doesn't strand it). A sortable column's sort control keeps
			// `cursor-pointer`: set on the control itself, it out-resolves this
			// inherited grab cursor on that child.
			grab: grab.default,
		},
		// Keeps the grip, title, and any sort control on one baseline. A block-level
		// flex (not inline) fills the header width so the title between the grip and
		// the filter button can shrink to an ellipsis instead of overrunning the cell.
		// The gap caps the hit areas of the header buttons, as in `filter.slot`.
		layout: [flex.row, 'min-w-0', dan.gap.scale.xs, dan.gap.touch.x.xs],
		// The grabbing cursor follows the live drag (`data-[dragging]`), not the
		// pointer's `:active` state: a right-click presses the grip `<button>` into
		// `:active` too, and the context menu swallowing the matching pointerup
		// would leave that cursor stuck as if the column were still held.
		// `-ms-1.5` pulls the grip toward the inline start by the GripVertical glyph's
		// optical inset (its dots sit a third of the way into the `size-5` box), so the
		// visible grip lines up over the column's cell values instead of floating a step
		// past their start.
		// That pull seats the box flush to the table's horizontal scroll wrapper
		// (`overflow-x-auto`), so its focus ring is `inset` (clip-safe, like
		// `k.nav.cell` and the `k.resize.grip` color shift) rather than the outset
		// `ring` the wrapper would shave at the edge.
		handle: [...grip, '-ms-1.5'],
	},
	row: {
		// A clickable row (`onRowClick`): the pointer cursor and a keyboard focus
		// ring (the row is a roving tab stop). The ring is `inset` (clip-safe, like
		// `k.nav.cell` and the reorder grip), since the grid's horizontal scroll
		// wrapper (`overflow-x-auto`) shaves the outset `ring`'s offset stroke at the
		// row's leading/trailing edge. Its hover wash is the shared `<Table hover>`
		// variant `GridData` enables for a row click. Interactive cell content
		// (buttons, the select checkbox) handles its own clicks; the row guard skips
		// those.
		clickable: ['cursor-pointer', focus.inset],
		// A row that `rowLoading` marks, while it waits on data (`hannou.busy`).
		loading: busy,
		group: {
			// A 2px colored rail down the group's leading edge: carried by the first
			// cell of every row in the group (its header and each leaf) so it reads as one
			// continuous bar, the row-group analog of a column group's underline rule. It
			// takes a neutral tint by default; the row manager swaps in a per-group
			// palette color (`rail.color[group.color]`).
			rail: {
				// The neutral rail (see {@link railBorder}), on the leading cell of every group row.
				border: railBorder,
				// Per-group rail color (see {@link railColor}): the manager's palette hue,
				// replacing the neutral `border` tint on the leading cell of every group row.
				color: railColor,
			},
			// Chevron at the row's trailing edge: the group row renders a right chevron
			// when collapsed and a down chevron when expanded; `shrink-0` holds its size
			// beside the label. A right-to-left grid mirrors it, so a collapsed chevron
			// points to the inline end. The mirror leaves the down chevron as it is.
			chevron: ['shrink-0', 'rtl:-scale-x-100'],
			// The reveal wrapper inside each leaf cell.
			reveal: {
				...reveal,
				// The cell padding on the reveal wrapper, in the stepped class of the
				// kata/table cell padding, so an animated leaf cell matches an ordinary one,
				// and collapses that padding to nothing at height 0.
				pad: dan.space.cell.base,
			},
		},
		reorder: {
			// The row drag-handle cell: a narrow, centered column holding the grip,
			// sized to content like the selection cell.
			cell: fitCell,
			// Grip button carrying the row's drag activator: the grip of the column
			// reorder handle (`k.reorder.handle`), with no optical pull. `touch-none`
			// keeps a touch-drag from scrolling the page instead of lifting the row.
			handle: {
				base: grip,
				// The grip while reordering is unavailable (a column sort orders the
				// rows, or the `rowReorder` prop sets `disabled`). It shows for layout
				// stability but is inert and dimmed, so it reads as "not draggable now"
				// rather than missing.
				disabled: [flex.inline, 'shrink-0', text.muted, 'opacity-50', 'cursor-not-allowed'],
			},
			// Lifts the actively dragged row above its siblings on an opaque surface
			// with a shadow, so the rows it slides over stay hidden behind it: a
			// transparent `<tr>` would let their content bleed through. Gated on the
			// `data-[dragging]` the row carries; the fill matches the surface under the
			// grid (see `hostSurface`/`draggingSurface`).
			dragging: [
				'data-dragging:relative',
				'data-dragging:z-10',
				'data-dragging:shadow-lg',
				...draggingSurface,
			],
		},
		// The new-row slot of an editable grid. Its cells stick to the top or the
		// bottom edge of the scroll container, over the data rows (`z-[1]` for a
		// pinned cell) and under the sticky header (`z-10`). A pinned cell of the
		// slot rides one layer higher, so a scrolled cell of the slot slides under
		// it. The top offset is the height of a sticky header, which the slot
		// measures into `--grid-new-row-top`.
		new: {
			cell: {
				base: ['sticky z-[2]', hostSurface],
				pinned: 'z-[3]',
				top: 'top-(--grid-new-row-top)',
				bottom: 'bottom-0',
				// The cell of the Add column. It also sticks to the inline end, over a
				// scrolled cell of the slot, like a pinned cell. The column is empty in the
				// other rows, so only this cell sticks there.
				add: 'end-0 z-[3] w-px whitespace-nowrap',
			},
			// The box around the control of the Add cell. It is as wide as the
			// control at any width of the cell, so the cell can measure it.
			control: 'inline-flex w-max align-middle',
		},
	},
	aggregate: {
		// Aggregated figures on group-header and total rows: firmer than the data
		// they summarize, tabular so they align down their columns.
		cell: ['tabular-nums', weight.medium],
		// The total row's leading "Total" label, matching the figures' weight. The
		// grand total label is a row header, so the label sets the cell text color
		// over the muted color of a header.
		label: [text.default, weight.medium],
	},
	detail: {
		// The master-detail chevron in an expander cell: rotates a quarter-turn as
		// the panel opens (`data-open`), honoring `prefers-reduced-motion`. The
		// class rides the chevron `<svg>` directly (the expander passes `data-open`
		// and this recipe onto the lucide element), which rotates about its own
		// center without a wrapper. A right-to-left grid mirrors the chevron, so it
		// points to the inline end, and turns it counterclockwise, so it still points
		// down once open. CSS applies the rotate after the scale.
		chevron: [
			'shrink-0',
			'transition-transform',
			'duration-200',
			'motion-reduce:transition-none',
			'data-open:rotate-90',
			'rtl:-scale-x-100',
			'rtl:data-open:-rotate-90',
		],
		// The reveal wrapper in the `<td>` of the detail row, as the group leaves
		// have, so a panel grows and shrinks to its content height.
		reveal: { ...reveal },
		// The panel's own inset, set off from the rows with a hairline top rule and
		// a faint recessed surface so it reads as a nested region, not another row.
		panel: [
			'p-3',
			'border-t-2',
			...mode(
				['border-zinc-950/5 bg-zinc-50', 'contrast-more:border-zinc-950/50'],
				['dark:border-white/10 dark:bg-white/[0.02]', 'dark:contrast-more:border-white/50'],
			),
		],
	},
	resize: {
		// Fixed layout + a <colgroup> of exact widths so resizing one column
		// changes only that column (and the table's total width) instead of
		// redistributing across siblings; the table scrolls horizontally past its
		// container in the Table's own overflow wrapper.
		fixed: 'table-fixed',
		// The `<colgroup>` of a resizable grid. Chromium can select a `<col>` as
		// the scroll anchor, and a `<col>` does not move when a row above the
		// viewport opens or closes. So the anchor skips the `<colgroup>`, and it
		// selects a body row, as it does in a grid that is not resizable.
		colgroup: '[overflow-anchor:none]',
		// Anchors the absolutely-positioned resize handle on a non-sticky header (a
		// sticky header already positions itself; a reordering header's shift
		// transform also forms a containing block, but `relative` keeps the anchor
		// explicit and shared by both). The handle lives in the header, so there is
		// no body-region overflow to lift over the column's cells.
		cell: 'relative',
		// The trailing padding of each resizable header, on the `<table>` element.
		metrics: resizeMetrics,
		// Resize grab zone on a resizable header's trailing edge, anchored to the
		// inside of that edge (`end-0`, no outward shift) and widening into the cell.
		// The edge is logical, so a right-to-left header holds it on the left. Its
		// width is twice the horizontal cell padding at each step, the ramp of
		// `metrics`. It spans the header cell's height (`h-full`): the
		// affordance lives in the header, not down the column. `justify-center` lands
		// the grip one cell-padding in from the trailing edge (flush with where a
		// truncating header's label and body values clip) and `items-center` centers
		// the short grip vertically. The grab zone does not overhang the
		// boundary: an outward overhang gets painted over by a neighbor's opaque
		// sticky/pinned header, and on the trailing column inflates the horizontal scroll.
		handle: [
			`absolute top-0 end-0 z-10 h-full ${dan.size.resize.handle}`,
			flex.row,
			'justify-center',
			'cursor-col-resize touch-none select-none outline-none',
		],
		// Grip line, which the handle draws as its `::after`: a short 2px rounded
		// bar (`h-4`) in the resize grip ink (`sen.grip`) of the `ResizableHandle`
		// grip, so every resize affordance reads the same. It is centered in the grab
		// zone (`justify-center` on the handle) one cell-padding in from the trailing
		// edge. Always visible: muted at rest, tinting on hover, turning accent on
		// keyboard focus or active drag. Focus shows as a color change, not an outset
		// ring, so the scroll container can't clip it.
		grip: [
			'after:h-4 after:w-0.5',
			'after:transition-colors',
			...sen.grip,
			'data-resizing:after:bg-blue-500 dark:data-resizing:after:bg-blue-500',
			// The drag color outranks the shape too, so the shape repeats under it.
			'forced-colors:data-resizing:after:bg-[CanvasText]',
		],
	},
	// The automatic layout: the browser's automatic table layout, while the
	// `<table>` carries `data-grid-fit-layout`. The browser sizes each column from
	// its content. A grid whose widths the browser owns renders this layout, on the
	// server too (see `createColumnSizer`). The cell rules act only in this layout,
	// so the fixed layout of a sized grid keeps its widths.
	fit: {
		// On the `<table>`. `fill` keeps the `w-full` of the table, so the browser
		// gives the spare width to the columns. `content` takes the width of the
		// content.
		table: ['data-grid-fit-layout:table-auto', 'data-[grid-fit-layout=content]:w-max'],
		// On a data header: the floor of the column. That is its `minWidth`, else
		// 40px, or its least width when that is more (`--grid-min`, see
		// `fitHeaderProps`). Keep the 40px in step with `DEFAULT_MIN_COLUMN_SIZE`.
		floor: 'in-data-grid-fit-layout:min-w-[var(--grid-min,40px)]',
		// On a data header: a column that takes no spare width. That is a frozen
		// column, or a column with a `maxWidth`.
		tight: 'in-data-grid-fit-layout:w-px',
		// A column that keeps its width (a `width` seed): its `<col>` holds the
		// width, and its content does not widen it.
		kept: {
			head: 'in-data-grid-fit-layout:**:data-grid-header:contain-inline-size',
			cell: 'in-data-grid-fit-layout:**:data-grid-content:contain-inline-size',
		},
		// On the content span of a body cell: the content asks for 480px at most,
		// or for the `maxWidth` of its column (`--grid-cap`). The span still fills
		// a wider column. Keep the 480px in step with `DEFAULT_CONTENT_MAX`.
		cap: [
			'in-data-grid-fit-layout:max-w-[var(--grid-cap,480px)]',
			'in-data-grid-fit-layout:min-w-full',
		],
		// On the content span of a body cell, while the `<table>` carries
		// `data-grid-fit-held`: the content does not widen its column. The least
		// width of the header holds the content that the grid measured, so a later
		// row truncates until the next pass reads it.
		held: 'in-data-grid-fit-held:contain-inline-size',
		// On the control box of the Add cell while an add is in flight: the wider
		// pending label does not widen the column, which keeps its measured width.
		pending: 'in-data-grid-fit-layout:contain-inline-size',
	},
	filter: {
		// Header row: title on the left, filter button across from it on the right.
		// In a narrow column the group-by and filter buttons close to the gap, so
		// the gap also caps their hit areas (`TouchTarget`).
		slot: [flex.row, 'justify-between', dan.gap.scale.xs, dan.gap.touch.x.xs],
		// The filter icon button in a column header.
		button: headerButton,
	},
	footer: {
		// Footer below the table. The footer is its own size container, so the
		// layout follows the width that the grid has (a dashboard tile, a
		// dialog, a page), not the viewport.
		base: ['@container', 'pt-2'],
		// One row of three equal `flex-1` tracks at all widths: the page-size
		// picker at the start, the navigation centered, and the row-range status
		// at the end.
		bar: [flex.row, dan.gap.scale.md],
		// Each `bare` form is a footer with no page-size picker, below `@2xl`: the
		// empty start track goes, so Previous/Next sit at the start and the status
		// at the end. From `@2xl` the numbered pages stay centered.
		controls: {
			// Page-size picker: the start track. It renders even when it is empty,
			// so the navigation stays centered.
			base: [flex.inline, flex.fill, dan.gap.scale.lg],
			bare: ['hidden', '@2xl:flex'],
		},
		nav: {
			// Page navigation: the centered middle track.
			base: ['flex', flex.fill, 'justify-center'],
			bare: ['justify-start', '@2xl:justify-center'],
		},
		// The `<Pagination>` in the track. The footer has its own narrow layout
		// (`pages`), so the pagination is not a size container here, and the
		// compact page list of `<Pagination>` stays off. It also takes the width
		// of its content again, so the track centers it.
		pagination: ['w-auto', '@container-normal'],
		// Numbered pages: only from `@2xl`. Below it, Previous/Next carry the
		// navigation and the status names the position.
		pages: ['hidden', '@2xl:flex'],
		// Row-range status ("1–10 of 47"): the end track, aligned to the inline
		// end.
		status: [size.md, text.muted, flex.fill, 'whitespace-nowrap', 'text-end', 'tabular-nums'],
	},
	// Condensed down-projections layered on the compact density the grid forwards
	// to `<Table>` when `condensed` is set. All cast from the `<table>` element
	// onto its descendants (like the table's own outline projections) so
	// cells and headers read no context and the family still renders in RSC. They
	// reach only what lives in the table's own DOM: a portaled overlay (context
	// menu, column-manager dialog) is out of scope and keeps the step around the grid,
	// since `condensed` is a table-density preset, not a theme its overlays adopt.
	condensed: {
		// Step header + body cell text below the table's `text-base` base. The
		// selector targets the cell element, so a consumer cell that sets its own
		// size still overrides it.
		// An icon or a badge in a cell takes the `sm` step of the table scope, and
		// one with an explicit `size` keeps that size.
		font: ['[&>*>tr>:is(td,th)]:text-sm'],
	},
	// The opt-in summary footer (`GridFooter`) below the table: a small, muted
	// status bar. Wraps on narrow viewports; the leading slot holds a single count
	// (the selected total swaps in over the row total in place), and any custom
	// content is pushed to the far edge by `ms-auto` in the trailing cluster.
	summary: {
		bar: [flex.row, 'flex-wrap', dan.gap.x.lg, dan.gap.y.xs, size.md, text.muted],
		// `min-w-0` so the cluster can shrink past its content: a flex item's automatic
		// minimum is its content width, which pinned this slot to the intrinsic width of
		// whatever the consumer rendered, overflowing the bar instead of clipping inside it.
		trailing: [flex.row, 'flex-wrap', dan.gap.x.lg, dan.gap.y.xs, 'ms-auto', 'min-w-0'],
		item: 'whitespace-nowrap',
	},
	// Data-body state washes projected from the `<table>` onto its data `<tbody>`
	// (`:first-of-type`, ahead of the grand-total body, so the header, filter row,
	// and totals stay crisp). Currently the server-sort settle: a manual sort emits
	// its change to the consumer, who fetches the reordered rows; until they land
	// the grid dims the current rows rather than swapping in a skeleton, so the data
	// stays readable while it reorders.
	body: {
		// While a server-side (manual) sort is in flight, the whole data body
		// signals busy until the reordered rows arrive. The signal is a
		// `motion-safe` pulse, or, for a reduced-motion user, a static 50% dim in
		// its place (never both: the pulse already troughs to that opacity, so the
		// standing dim is the reduced-motion fallback alone).
		settling: [
			'[&>tbody:first-of-type]:motion-safe:animate-pulse',
			'[&>tbody:first-of-type]:motion-reduce:opacity-50',
		],
	},
	// The "Exporting" overlay: a scrim over the whole grid while an async export
	// resolves its rows, with a centered label.
	//
	// It covers the grid wrapper rather than the table alone, so the search,
	// filters, and sort that decide *what* is being exported can't be changed out
	// from under a file mid-write. `k.wrapper.base` already carries `relative isolate`,
	// so the scrim needs no positioning host of its own and its z-index is scoped
	// to the grid's own stacking context: above the frozen header's `z-20`, and
	// still under page chrome outside the grid.
	exporting: {
		scrim: ['absolute inset-0 z-30', flex.row, 'justify-center', ...backdrop.base],
		// Reads as lifted off the scrim: the same fill + ring + shadow a floating
		// panel takes, so the label belongs to the library's raised surfaces rather
		// than being a bare string over a blur.
		label: [
			// `flex.row` centers its items already; only the gap and box are ours.
			flex.row,
			dan.gap.scale.sm,
			'px-3 py-2',
			rounded.md,
			'shadow-md',
			...omote.panel.base,
			size.sm,
			weight.medium,
		],
	},
	// Framer transition configs (spread/passed to an `m` element, never to
	// `cn`). Unlike the CSS `grid-template-rows` reveals the group and detail rows
	// use, a sort reflow moves whole rows between slots: a FLIP `layout` animation,
	// which only a real `m.tr` can drive.
	motion: {
		// Layout transition for the sort row reflow: on a sort, each stable-keyed
		// row FLIPs from its old place to its new one on the shared `layoutId`
		// spring. Reduced motion stands the whole animation down upstream, so no
		// `instant` branch is needed here.
		sort: { layout: spring.slide },
		// The make-room glide of an in-flight column drag. Applied imperatively
		// (`animate()` onto the shift CSS variable in `grid-reorder.ts`), never
		// spread onto a motion element.
		shift: spring.snap,
		// The shift under reduced motion: the columns make room at once.
		instant,
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
			'data-active:ring-2',
			'data-active:ring-inset',
			...mode('data-active:ring-blue-600', 'dark:data-active:ring-blue-500'),
			// Forced colors remove the ring, which is a box-shadow. This inset outline
			// replaces it there, as in `focus.inset`.
			'forced-colors:data-active:outline-solid forced-colors:data-active:outline-2',
			'forced-colors:data-active:-outline-offset-2 forced-colors:data-active:outline-[Highlight]',
			// A cell of the cursor's range (`range`) takes a tint and a hairline
			// outline. The outline, not the tint, holds the 3:1 contrast of the state
			// (WCAG 1.4.11). It is an outline, so it does not stack with the ring.
			'data-in-range:outline-1',
			'data-in-range:-outline-offset-1',
			...mode(
				'data-in-range:bg-blue-50 data-in-range:outline-blue-600',
				'dark:data-in-range:bg-blue-950 dark:data-in-range:outline-blue-500',
			),
		],
		// These keys style the fill handle overlay on the active cell.
		fill: {
			// The anchor of the overlay: a line of no height after the table, in its
			// scroll container. It holds the overlay, so the overlay scrolls with the
			// cells.
			anchor: 'relative h-0',
			// The box of the overlay, which the grid places on the active cell. It
			// lets the pointer through to the cell. A pinned cell sits over the
			// scrolled cells, and the box sits over the pinned cell.
			// The box moves by a physical `translate` from the left edge of the anchor.
			// biome-ignore lint/plugin/no-physical-side: `placeBox` measures from the left edge
			box: 'pointer-events-none absolute top-0 left-0 z-0 data-pinned:z-[1]',
			// The fill handle on the bottom end corner of the active cell (`range` in
			// a managed editable grid). A drag from it fills. The square sits inside
			// the corner, so the scroll region does not clip it at the last row or
			// column, and a wider hit area sits around it. The keys and the cell menu
			// give the same fills with no drag (WCAG 2.5.7).
			handle: [
				'pointer-events-auto absolute bottom-0 end-0 size-2 cursor-crosshair border',
				'before:absolute before:-inset-1.5',
				...mode('border-white bg-blue-600', 'dark:border-zinc-900 dark:bg-blue-500'),
			],
		},
	},
	// Inline editing: an open cell renders its editor (the grid's own Input /
	// NumberInput / Listbox, or a column `editCell` slot) on the `bare` surface
	// of a Control, so the editor draws no chrome and takes the full content
	// width of the cell. The cell draws the frame and the focus ring instead.
	edit: {
		// The rings of an editable data cell while it holds an open editor
		// (`host`). The cursor's ring (`k.nav.cell`) marks the active cell. An open
		// cell that has neither the cursor nor focus takes a hairline, so the
		// cells of an open row read as fields. The cell with focus takes the ring
		// of the cursor. A refused value rings the cell red, focused or not. The
		// selectors exclude each other, so no ring stacks on another.
		cell: [
			'has-[[data-slot=grid-edit-host]]:ring-inset',
			'has-[[data-slot=grid-edit-host]:not([data-invalid])]:not-data-active:not-focus-within:ring-1',
			...mode(
				'has-[[data-slot=grid-edit-host]:not([data-invalid])]:not-data-active:not-focus-within:ring-zinc-300',
				'dark:has-[[data-slot=grid-edit-host]:not([data-invalid])]:not-data-active:not-focus-within:ring-zinc-700',
			),
			'has-[[data-slot=grid-edit-host]:not([data-invalid])]:focus-within:ring-2',
			...mode(
				'has-[[data-slot=grid-edit-host]:not([data-invalid])]:focus-within:ring-blue-600',
				'dark:has-[[data-slot=grid-edit-host]:not([data-invalid])]:focus-within:ring-blue-500',
			),
			'has-[[data-slot=grid-edit-host][data-invalid]]:ring-2',
			...mode(
				'has-[[data-slot=grid-edit-host][data-invalid]]:ring-red-600',
				'dark:has-[[data-slot=grid-edit-host][data-invalid]]:ring-red-500',
			),
			// Forced colors remove the rings, which are box-shadows. An inset
			// outline replaces each: 1px for an open cell, 2px in `Highlight` for
			// the cell with focus, and 2px for a refused value.
			'forced-colors:has-[[data-slot=grid-edit-host]]:outline-solid',
			'forced-colors:has-[[data-slot=grid-edit-host]]:outline-1',
			'forced-colors:has-[[data-slot=grid-edit-host]]:-outline-offset-1',
			'forced-colors:has-[[data-slot=grid-edit-host]]:focus-within:outline-2',
			'forced-colors:has-[[data-slot=grid-edit-host]]:focus-within:-outline-offset-2',
			'forced-colors:has-[[data-slot=grid-edit-host]]:focus-within:outline-[Highlight]',
			'forced-colors:has-[[data-slot=grid-edit-host][data-invalid]]:outline-2',
			'forced-colors:has-[[data-slot=grid-edit-host][data-invalid]]:-outline-offset-2',
		],
		// Host for a cell's editor. Its one grid area stacks the editor over the
		// display content (`rest`), so the cell keeps the height that it has at
		// rest. The track has no least width, so neither layer widens the column.
		host: ['grid grid-cols-[minmax(0,1fr)]', 'w-full'],
		// The display content of the cell, under the editor. It holds the height
		// of the cell and shows nothing.
		rest: ['col-start-1 row-start-1', 'invisible truncate'],
		// The slot that holds the editor, over `rest`. A column flex stretches the
		// editor to the width of the slot, also through the `display: contents`
		// wrapper of a listbox or a date picker. Thus a consumer's `editCell`
		// control fills the cell with no width of its own. The slot centers the
		// editor in the height of the cell.
		slot: ['col-start-1 row-start-1', flex.col, 'justify-center', 'min-w-0'],
		// The in-cell control fills the cell width.
		input: 'w-full',
		// The floating column below the cell: the settle controls at the end edge,
		// then the message of a failed validation. Floating UI anchors it to the
		// cell and sets its least width to the width of the cell. When it flips
		// above the cell, the order turns, so the controls stay next to the cell.
		// It lets the pointer through outside its children.
		below: [
			flex.col,
			'items-end',
			'data-[side=top]:flex-col-reverse',
			dan.gap.scale.xs,
			'pointer-events-none',
			'*:pointer-events-auto',
		],
		// The settle pair of a cell-scoped session: a tab of the popover surface
		// at the end corner of the cell. No padding on the buttons: `Button`'s
		// bare icon-only floor is sized per density, and overriding it here would
		// drop the pair under the 24x24 target minimum (WCAG 2.5.8) at every
		// density, worst in a condensed grid. The gap also caps the hit areas
		// (`TouchTarget`): the two buttons split it and do not overlap.
		settle: [
			flex.row,
			'gap-0.5 [--touch-target-gap-x:--spacing(0.5)]',
			'p-0.5',
			rounded.md,
			...popover,
			'shadow-sm',
		],
		// A cell whose async commit is in flight. It signals busy the way
		// `body.settling` does for a server sort (`hannou.busy`).
		pending: busy,
		// The state of a failed validation: `base` is the message below the
		// editor, and `ring` rings the editor host of the new-row slot, whose
		// editors keep their frame. A data cell rings itself (`cell`).
		error: {
			base: [
				'self-start max-w-xs',
				'rounded px-1.5 py-0.5 whitespace-normal',
				size.xs,
				'text-white shadow',
				...mode('bg-red-600', 'dark:bg-red-500'),
			],
			ring: [...ring.line[2].inset, ...mode('ring-red-600', 'dark:ring-red-500'), rounded.md],
		},
	},
} as const
