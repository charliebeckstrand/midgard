/**
 * Events kata: the unit of the views of `ui/events`. The root slot `base` is
 * the pinned panel, and `body` and `footer` are its other parts.
 * The sheet and the pinned panel share the title `row`. The other slots are:
 *
 * - `button`: the header button.
 * - `dot`: the report dot of the header button.
 * - `ring`: the capture ring of the header button.
 * - `pin`: the Pin button of the sheet.
 * - `chevron`: the chevron slot of an entry.
 * - `text`: the text of an entry.
 * - `hash`: the color of the hash of a report.
 *
 * The `kind` extra colors the kinds that stand apart from the DOM events. They
 * are the callbacks of the components and of the modules, the captures, and
 * the bugs. The colors are the bare entries of the extended palette, which
 * clear AA on the surface.
 */
import { defineKata } from '../../core/recipe'
import { dan, hannou, iro, narabi, sen } from '../kiso'

const { x, top, bottom } = dan.space.panel

const { bare } = iro.extended

const { flex } = narabi
const { forced } = sen

export const k = defineKata(
	{
		// The panel shows only in the card of the aside of a sidebar layout
		// (`SidebarLayoutAside`), which paints the surface.
		base: [flex.col, 'h-full min-h-0'],
		slots: {
			body: [x, 'min-h-0 flex-1 overflow-auto py-2'],
			footer: [x, bottom, 'pt-2'],
			row: [x, top],
			/**
			 * The header button follows the layout of the enclosing sidebar layout. The
			 * pinned panel shows only beside the inline panel, so the button hides while
			 * the panel is pinned there. Pin shows there only (`narabi.offcanvas`).
			 * `layout` is a responsive axis.
			 */
			button: {
				base: 'hidden [:root[data-events]_&]:contents',
				responsive: {
					layout: {
						drawer: '[:root[data-events][data-events-pinned]_&]:contents',
						inline: '[:root[data-events][data-events-pinned]_&]:hidden',
					},
				},
			},
			/**
			 * The dot of the header button, which shows while the store holds a report.
			 * Forced colors remove its fill, so it paints the `mark`.
			 */
			dot: [
				'absolute end-1 top-1 hidden size-1.5 rounded-full bg-red-500',
				'[:root[data-events-reports]_&]:block',
				forced.mark,
			],
			/**
			 * The ring of the header button, which shows while a capture runs. The red
			 * of the icon is not the only sign of the capture (WCAG 1.4.1). Forced
			 * colors keep the border, so the ring stays.
			 */
			ring: [
				'absolute end-1 bottom-1 hidden size-2 rounded-full border-2 border-red-600',
				'[:root[data-events-capture]_&]:block',
			],
			/** The Pin button of the sheet, which shows in the inline layout only. */
			pin: { responsive: { layout: narabi.offcanvas.inline.inlineFlex } },
			/**
			 * The slot of the chevron, one line high. Each entry keeps it, so the texts
			 * start in one column. The slot of an entry with a panel carries
			 * `data-open`, and it turns while the panel opens (`hannou.turn`).
			 */
			chevron: ['flex size-4 shrink-0 items-center', ...hannou.turn],
			text: [...iro.text.default],
			hash: bare.rose,
		},
	},
	{
		kind: {
			component: bare.sky,
			module: bare.violet,
			capture: iro.text.primary,
			error: iro.text.error,
		},
	},
)
