import { kasane, omote, tsunagi } from '../kiso'

const { radius } = kasane
const { skeleton } = omote
const { base } = tsunagi

export const k = {
	base: [skeleton, 'block h-4', radius.rounded.lg, ...base],
} as const
