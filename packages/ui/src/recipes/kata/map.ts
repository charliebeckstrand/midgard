import { hannou, kasane, sen } from '../kiso'

export const k = {
	base: [
		'relative isolate overflow-hidden',
		'w-full h-full',
		sen.border.default,
		kasane.rounded.lg,
		hannou.disabled,
	],
	canvas: ['absolute inset-0'],
} as const
