import { kage } from '../kage'
import { omote } from '../omote'
import { waku } from '../waku'

export const textarea = {
	base: [waku.input, 'min-h-9'],
	variant: {
		default: [],
		outline: kage.borderEmphasis,
		glass: omote.glass,
	},
	control: {
		default: waku.controlSurface,
		outline: [],
		glass: [],
	},
	autoResize: 'field-sizing-content',
	/** Strips textarea chrome when nested inside a framed container. */
	bare: 'border-0 rounded-none pt-3 focus:outline-hidden',
	/** FormControl border when an actions slot is present. */
	frame: kage.border,
	/** Actions row beneath the textarea. */
	actions: 'flex items-center gap-2 px-1.5 pb-1.5',
	resize: {
		none: 'resize-none',
		vertical: 'resize-y',
		horizontal: 'resize-x',
	},
	defaults: { variant: 'default' as const, resize: 'none' as const, autoResize: false as const },
}
