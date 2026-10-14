/**
 * Events kata: object-literal surface for the views of `ui/events`. The sheet
 * and the pinned panel share the title `row`. The panel adds its card, its
 * `body`, and its `footer`. `kind` colors the kinds that stand apart from the
 * DOM events: the callbacks of the components and of the modules, the
 * captures, and the bugs. `hash` colors the hash of a report. The colors are
 * the `onSurface` shades of the ramp, which clear AA on the surface.
 */
import { iro, omote } from '../kiso'
import { dan } from '../kiso/dan'

const { x, top, bottom } = dan.space.panel

const onSurface = iro.extended.bare.text

export const k = {
	row: [x, top],
	panel: {
		base: [...omote.content, 'flex h-full min-h-0 flex-col'],
		body: [x, 'min-h-0 flex-1 overflow-auto py-2'],
		footer: [x, bottom, 'pt-2'],
	},
	text: [...iro.text.default],
	kind: {
		component: onSurface.sky,
		module: onSurface.violet,
		capture: iro.text.primary,
		error: iro.text.error,
	},
	hash: onSurface.rose,
} as const
