import { kasane, omote, tsunagi } from '../kiso'

export const k = {
	base: [omote.skeleton, 'block h-4', kasane.rounded.lg, ...tsunagi.base],
} as const
