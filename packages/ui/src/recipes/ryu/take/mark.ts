/** Mark density — shared by inline code and kbd. Sized to sit naturally within body text. */
export const mark = {
	base: ['font-mono', 'bg-current/15', 'rounded-md'],
	size: {
		sm: ['text-[0.625rem]/3', 'p-1'],
		md: ['text-xs/4', 'p-1.25'],
		lg: ['text-sm/5', 'p-1.5'],
	},
} as const
