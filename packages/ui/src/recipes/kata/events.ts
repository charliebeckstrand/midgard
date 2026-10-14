/**
 * Events kata: object-literal surface for the views of `ui/events`. The sheet
 * and the pinned panel share the title `row`. The panel adds its card, its
 * `body`, and its `footer`. `kind` colors the kinds that stand apart from the
 * DOM events: the callbacks of the components and of the modules, the
 * captures, and the bugs.
 */
import { iro, omote } from '../kiso'
import { dan } from '../kiso/dan'

const { x, top, bottom } = dan.space.panel

export const k = {
	row: [x, top],
	panel: {
		base: [...omote.content, 'flex h-full min-h-0 flex-col'],
		body: [x, 'min-h-0 flex-1 overflow-auto py-2'],
		footer: [x, bottom, 'pt-2'],
	},
	text: [...iro.text.default],
	kind: {
		component: 'text-sky-600 dark:text-sky-400',
		module: 'text-violet-600 dark:text-violet-400',
		capture: 'text-blue-600 dark:text-blue-400',
		error: 'text-red-600 dark:text-red-400',
	},
} as const
