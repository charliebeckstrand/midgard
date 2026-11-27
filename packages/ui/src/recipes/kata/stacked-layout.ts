/**
 * Stacked layout kata: the unit of `StackedLayout`. `body` is the main slot
 * between the header and the footer. It scrolls when a parent bounds the
 * height of the layout. While it scrolls, it is a tab stop, so it shows an
 * inset ring, because the scroll clips an outline outside the box.
 */
import { defineKata } from '../../core/recipe'
import { sen } from '../kiso'

export const k = defineKata({
	slots: {
		body: ['relative flex-1 min-h-0 overflow-y-auto print:overflow-visible', ...sen.focus.inset],
	},
})
