import { maru } from '../maru'

/** Mark density — shared by inline code and kbd. Sized to sit naturally within body text. */
export const mark = {
	base: ['min-w-6', 'font-mono', 'bg-current/15', maru.rounded.md],
	size: {
		sm: ['text-[0.625rem]', 'p-1'],
		md: ['text-xs', 'p-1.25'],
		lg: ['text-sm', 'p-1.5'],
	},
	margin: '',
} as const
