import type { Ma } from '../../recipes'
import { k } from '../../recipes/kata/split'
import { alignMap, type FlexAlign } from '../flex/variants'

export { alignMap }

export type SplitAlign = FlexAlign

export type SplitGap = Ma

export const gapMap = k.gap

export const ratioTuples = {
	'1/4': [1, 3],
	'1/3': [1, 2],
	'1/2': [1, 1],
	'2/3': [2, 1],
	'3/4': [3, 1],
} as const

export type SplitRatio = keyof typeof ratioTuples
export type SplitDirection = 'horizontal' | 'vertical'
