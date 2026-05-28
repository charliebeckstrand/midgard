import { kasane, omote } from '../kiso'

const { rounded } = kasane
const { skeleton } = omote

export const k = {
	base: [skeleton, 'block h-4', rounded.lg],
} as const
