/**
 * Shaku mark — inline-mark dimensions for `<code>` and `<kbd>`. Sized to
 * sit naturally within body text at three density steps.
 *
 * Layer: kiso · Concern: inline-mark dimension
 */

export const mark = {
	base: ['font-mono', 'bg-current/15', 'rounded-md'],
	size: {
		sm: ['text-[0.625rem]', 'p-1'],
		md: ['text-xs', 'p-1.25'],
		lg: ['text-sm', 'p-1.5'],
	},
} as const
