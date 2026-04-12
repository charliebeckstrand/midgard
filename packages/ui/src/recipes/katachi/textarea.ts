import { kage } from '../kage'
import { waku } from '../waku'

export const textarea = {
	base: [waku.input, 'min-h-9'],
	autoResize: 'field-sizing-content',
	/** Strip textarea chrome when the field is nested inside a framed container. */
	bare: 'border-0 rounded-none pt-3 focus:outline-hidden',
	/** Border for the wrapping FormControl when an actions slot is present. */
	frame: kage.border,
	/** Layout for the actions row rendered beneath the textarea. */
	actions: 'flex items-center gap-2 px-1.5 pb-1.5',
	resize: {
		none: 'resize-none',
		vertical: 'resize-y',
		horizontal: 'resize-x',
	},
	defaults: { resize: 'none' as const },
}
