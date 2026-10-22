/**
 * Events kata: the unit of the views of `ui/events`. The root slot `base` is
 * the card of the pinned panel, and `body` and `footer` are its other parts.
 * The sheet and the pinned panel share the title `row`. `button` is the header
 * button, `pin` is the Pin button of the sheet, `text` is the text of an entry, and `hash` colors the hash of a
 * report. The `kind` extra colors the kinds that stand apart from the DOM
 * events: the callbacks of the components and of the modules, the captures,
 * and the bugs. The colors are the bare entries of the extended palette, which
 * clear AA on the surface.
 */
import { defineKata } from '../../core/recipe'
import { dan, iro, narabi, omote } from '../kiso'

const { x, top, bottom } = dan.space.panel

const { bare } = iro.extended

export const k = defineKata(
	{
		// The panel shows only in the aside of a sidebar layout, which shows only
		// while the layout is inline, so the panel is always a card.
		base: [omote.content.card, 'flex h-full min-h-0 flex-col'],
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
			/** The Pin button of the sheet, which shows in the inline layout only. */
			pin: { responsive: { layout: narabi.offcanvas.inline.inlineFlex } },
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
