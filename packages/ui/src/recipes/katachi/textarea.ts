import { waku } from '../waku'

export const textarea = {
	base: [waku.input, 'min-h-9'],
	resize: {
		none: 'resize-none',
		vertical: 'resize-y',
		horizontal: 'resize-x',
	},
	defaults: { resize: 'none' as const },
}
