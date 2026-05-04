/** Mark density — shared by inline code and kbd. Sized to sit naturally within body text. */
export const mark = {
	base: ['font-mono', 'bg-current/15', 'rounded-md'],
	size: {
		sm: ['text-[0.625rem]', 'p-1'],
		md: ['text-xs', 'p-1.25'],
		lg: ['text-sm', 'p-1.5'],
	},
} as const
