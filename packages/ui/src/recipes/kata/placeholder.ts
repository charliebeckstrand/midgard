import { kasane, omote, tsunagi } from '../kiso'

const { rounded } = kasane
const { skeleton } = omote
const { base } = tsunagi

export const k = {
	base: [skeleton, 'block h-4', rounded.lg, ...base],
} as const
