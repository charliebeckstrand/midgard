/**
 * Menu kata: the object-literal surface of the `<Menu>` and `<Dropdown>`
 * popover lists. The panel is a density scope. The `item` row, the
 * `header.title`, and the `viewport` scroll container take the step of that
 * scope through stepped classes. The other parts are static:
 *
 * - `content` is the panel box, and `surface` and `floating` are the wrapper
 *   and the panel of a floating menu.
 * - `sheet` holds the rows of the bottom sheet on a phone, and `sheet.body` is
 *   the body of that sheet.
 * - `header` is the box above the rows, and `header.title` and
 *   `header.description` are its two lines.
 * - `sub` holds the parts of a submenu. `trigger` is the wash on an open
 *   parent row, and `chevron` and `group` are parts of a submenu in the bottom
 *   sheet.
 * - `section`, `heading`, `label`, `text`, `description`, `shortcut`, and the
 *   `separator` divider are the other parts of a panel.
 */
import { defineScale } from '../../core/density'
import { defineRecipe, mode } from '../../core/recipe'
import { hannou, iro, ji, narabi, sen } from '../kiso'
import { dan } from '../kiso/dan'

const { on, text } = iro
const { size, weight } = ji
const { flex, description } = narabi
const { divider } = sen

const item = [
	// `hannou.active` layers the `data-active` wash beside `hannou.item`'s
	// focus/hover wash: a dropdown roves its items via `aria-activedescendant`
	// (focus stays on the trigger), marking the active row `data-active` rather
	// than focusing it, so the highlight must key off that too.
	'group/option',
	flex.row,
	'w-full',
	...hannou.item,
	...hannou.active,
	...narabi.item,
	`${dan.gap.option} ${dan.space.menu.item.x} ${dan.space.option.y}`,
	ji.ramp,
]

// The scrollable item region inside the panel.
const viewport = defineRecipe({
	base: [
		'space-y-0.5',
		// `min-h-0` lets the viewport shrink when the floating layer caps the
		// height of a panel to the space on its side of the trigger.
		'min-h-0 overflow-y-auto overscroll-contain',
		// The panel surface is translucent glass, so an overlay gradient has no
		// solid color to fade into; a mask fades the scrolled content itself.
		// The fade extents default to zero and open per edge while
		// `useScrollOverflow` stamps the matching overflow attribute.
		'[mask-image:linear-gradient(to_bottom,transparent,black_var(--menu-fade-above,0px),black_calc(100%-var(--menu-fade-below,0px)),transparent)]',
		'data-overflow-above:[--menu-fade-above:1.5rem]',
		'data-overflow-below:[--menu-fade-below:1.5rem]',
	],
	// Off by default: a menu is normally a short, fixed item set, where a cap
	// clips the last row and reads as truncation rather than as more content
	// below. `true` caps a long panel where the viewport has space for all of
	// it. A floating panel also has the cap of the floating layer, which keeps it
	// on screen. The scroll container stays either way, so a capped panel can still reach its end.
	//
	// The cap of each density step cuts the last visible row at about its
	// middle. Thus a clipped row, and not only the edge fade, shows that more
	// content is below. A panel that is not capped gets no `max-h` class.
	capped: { true: dan.size.menu.max, false: '' },
	defaults: { capped: false },
})

export const k = {
	content: 'min-w-48',
	// The positioned wrapper of a floating panel. The floating layer writes its
	// max-height when the panel is taller than the space on its side of the
	// trigger. The column lets the panel shrink into that cap.
	surface: 'flex flex-col',
	// A floating panel. `relative` puts the panel back in flow (the popover base
	// is `absolute`), so the wrapper shrink-wraps to it. The column and `min-h-0`
	// pass the cap of the wrapper on to the viewport, which scrolls.
	floating: 'relative flex min-h-0 flex-col',
	sheet: {
		// The rows of a dropdown that opens as a bottom sheet on a phone. The
		// drawer is the surface, so the rows get no panel chrome of their own.
		base: 'space-y-0.5 pb-2 outline-hidden',
		// The drawer body of the sheet. The rows carry their own inset, so the body
		// keeps a gutter that lines the row text up with the heading.
		body: 'px-3',
	},
	sub: {
		// A `MenuSub` parent keeps its wash while the panel is open (`data-open`),
		// so the row the pointer traveled from still reads as the live trail back —
		// `hannou.item`'s hover tint alone drops the moment the pointer leaves it.
		trigger: mode('data-open:bg-zinc-950/5', 'dark:data-open:bg-white/5'),
		// The chevron of a `MenuSub` row in the bottom sheet, which turns over
		// while the rows of the submenu show below the row.
		chevron: 'ms-auto transition-transform',
		// The rows of a `MenuSub` in the bottom sheet, below their parent row. The
		// indent shows that they belong to it.
		group: 'min-w-0 space-y-0.5 ps-4',
	},
	viewport,
	item,
	header: {
		// The box of the title and the description of a panel, above its rows. The
		// header does not shrink, so the rows below it scroll when the panel is
		// capped.
		base: 'shrink-0 px-3 pb-1 pt-2',
		title: [ji.ramp, weight.semibold, text.default],
		description: [size.xs, text.muted],
	},
	section: 'first:pt-0 last:pb-0',
	heading: ['px-3 pb-1 pt-2', size.xs, weight.medium, text.muted],
	label: 'truncate',
	// A column that stacks a label over its description.
	text: narabi.text,
	// `on.wash.muted`, not `muted`: `hannou.item` / `hannou.active` ground a hovered
	// or roved row on the tint wash, which `muted` is not legal over. See `iro/ramp.ts`.
	description: [description, on.wash.muted, 'group-focus/option:text-white'],
	shortcut: 'ms-auto',
	separator: divider.top,
} as const

/** The size scale of {@link Menu}: the steps of its item gap, padding, and height cap. */
export const scale = defineScale(
	dan.gap.option,
	dan.space.menu.item.x,
	dan.space.option.y,
	dan.size.menu.max,
)
