import { hannou, kasane, kokkaku, sen } from '../kiso'

const { disabled } = hannou
const { rounded } = kasane
const { map } = kokkaku
const { border } = sen

export const k = {
	base: [
		'relative isolate overflow-hidden',
		'w-full h-full',
		border.default,
		rounded.lg,
		...disabled,
	],
	canvas: ['absolute inset-0'],
	skeleton: map,
} as const
