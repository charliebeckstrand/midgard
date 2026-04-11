import { maru } from '../maru'

/**
 * Mark density — shared by inline code and kbd.
 * Tighter than compact — inline text marks with monospace glyphs,
 * subtle tinted background, and uniform padding. Sized to sit
 * naturally within surrounding body text.
 */
export const mark = {
	base: ['min-w-6', 'font-mono', 'bg-current/15', maru.roundedMd],
	size: {
		sm: ['text-[0.625rem]', 'p-1'],
		md: ['text-xs', 'p-1.25'],
		lg: ['text-sm', 'p-1.5'],
	},
	margin: 'not-first:ml-1 not-last:mr-1',
} as const
