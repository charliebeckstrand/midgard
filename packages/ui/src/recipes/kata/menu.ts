/**
 * Menu kata: the unit of the `<Menu>` and `<Dropdown>` popover lists. The root
 * slot `base` is the panel box, and the panel is a density scope. The `item`
 * row, the `title` of the header, and the `viewport` scroll container take the
 * step of that scope through stepped classes. `item` is the unit of a row,
 * which extends the item group: its root, and its `label`, `text`,
 * `description`, and `shortcut` slots. The other slots:
 *
 * - `surface` and `floating` are the wrapper and the panel of a floating menu.
 * - `header` is the box above the rows, and `title` and `description` are its
 *   two lines.
 * - `section`, `heading`, and the `separator` divider are the other parts of
 *   a panel.
 *
 * Two extras hold the parts of other presentations. `sheet` holds the rows of
 * the bottom sheet on a phone, and `sheet.body` is the body of that sheet.
 * `sub` holds the parts of a submenu: `trigger` is the wash on an open parent
 * row, and `chevron` and `group` are parts of a submenu in the bottom sheet.
 */
import { defineScale } from '../../core/density'
import { defineKata, mode } from '../../core/recipe'
import { dan, iro, ji, narabi, omote, sen } from '../kiso'
import { item } from '../kumi/item'

const { text } = iro
const { size, weight } = ji
const { fit, flex } = narabi
const { divider } = sen

/**
 * The row of a menu. The menu pads its row by the step of the nearest density
 * scope, and lays out an icon, a label, and a shortcut on one line.
 */
const row = defineKata({
	extends: item,
	base: [
		flex.row,
		'w-full',
		...narabi.item,
		`${dan.gap.option} ${dan.space.menu.item.x} ${dan.space.option.y}`,
		ji.ramp,
	],
})

export const k = defineKata(
	{
		base: 'min-w-48',
		slots: {
			// The positioned wrapper of a floating panel. The floating layer writes its
			// max-height when the panel is taller than the space on its side of the
			// trigger. The column lets the panel shrink into that cap.
			surface: fit.wrapper,
			// A floating panel. `relative` puts the panel back in flow (the popover base
			// is `absolute`), so the wrapper shrink-wraps to it. The column and `min-h-0`
			// pass the cap of the wrapper on to the viewport, which scrolls.
			floating: ['relative', fit.column],
			// The scrollable item region inside the panel.
			viewport: {
				base: [
					'space-y-0.5',
					// `min-h-0` lets the viewport shrink when the floating layer caps the
					// height of a panel to the space on its side of the trigger.
					fit.scroll,
					// The panel surface is translucent glass, so an overlay gradient has no
					// solid color to fade into; a mask fades the scrolled content itself.
					// The edge with content behind it fades, in CSS with no script. When the
					// rows fit, no mask applies.
					...omote.fade.block,
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
			},
			// The box of the title and the description of a panel, above its rows. The
			// header does not shrink, so the rows below it scroll when the panel is
			// capped.
			header: {
				base: 'shrink-0 px-3 pb-1 pt-2',
				slots: {
					title: [ji.ramp, weight.semibold, text.default],
					description: [size.xs, text.muted],
				},
			},
			section: 'first:pt-0 last:pb-0',
			heading: ['px-3 pb-1 pt-2', size.xs, weight.medium, text.muted],
			separator: divider.top,
		},
		defaults: { capped: false },
	},
	{
		item: row,
		sheet: {
			// The rows of a dropdown that opens as a bottom sheet on a phone. The
			// drawer is the surface, so the rows get no panel chrome of their own.
			base: 'space-y-0.5 pb-2 outline-hidden',
			// The drawer body of the sheet. The rows carry their own inset, so the body
			// keeps a gutter that lines the row text up with the heading. The gutter is
			// the panel inset less the inline padding of a row, which at each step is the
			// padding of a row again. `menu-sheet-gutter.test.ts` holds it.
			body: dan.space.menu.item.x,
		},
		sub: {
			// A `MenuSub` parent keeps its wash while the panel is open (`data-open`),
			// so the row the pointer traveled from still reads as the live trail back:
			// The hover wash of the row alone drops the moment the pointer leaves it.
			// Forced colors remove the wash, so the row draws an outline there instead:
			// an edge rather than the `Highlight` fill of the roving cursor.
			trigger: [
				...mode('data-open:bg-zinc-950/5', 'dark:data-open:bg-white/5'),
				'forced-colors:data-open:outline-solid forced-colors:data-open:outline-1 forced-colors:data-open:-outline-offset-1',
			],
			// The chevron of a `MenuSub` row in the bottom sheet, which turns over
			// while the rows of the submenu show below the row.
			chevron: 'ms-auto motion-safe:transition-transform',
			// The rows of a `MenuSub` in the bottom sheet, below their parent row. The
			// indent shows that they belong to it.
			group: 'min-w-0 space-y-0.5 ps-4',
		},
	},
)

/** The size scale of {@link Menu}: the steps of its item gap, padding, and height cap. */
export const scale = defineScale(
	dan.gap.option,
	dan.space.menu.item.x,
	dan.space.option.y,
	dan.size.menu.max,
)
