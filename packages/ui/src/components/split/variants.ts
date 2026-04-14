import { kumi } from '../../recipes'

export const gapMap = kumi.gap

export type SplitGap = keyof typeof kumi.gap

export const ratioTuples = {
	'1/4': [1, 3],
	'1/3': [1, 2],
	'1/2': [1, 1],
	'2/3': [2, 1],
	'3/4': [3, 1],
} as const

export type SplitRatio = keyof typeof ratioTuples
export type SplitDirection = 'horizontal' | 'vertical'
