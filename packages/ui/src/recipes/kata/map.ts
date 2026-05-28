import { hannou, kasane, sen } from '../kiso'

const { disabled } = hannou
const { radius } = kasane
const { border } = sen

export const k = {
	base: [
		'relative isolate overflow-hidden',
		'w-full h-full',
		border.default,
		radius.rounded.lg,
		disabled,
	],
	canvas: ['absolute inset-0'],
} as const
