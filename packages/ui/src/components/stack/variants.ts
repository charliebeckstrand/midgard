export const directionMap = {
	row: 'flex-row',
	column: 'flex-col',
	'row-reverse': 'flex-row-reverse',
	'column-reverse': 'flex-col-reverse',
} as const

export const alignMap = {
	start: 'items-start',
	center: 'items-center',
	end: 'items-end',
	stretch: 'items-stretch',
	baseline: 'items-baseline',
} as const

export const justifyMap = {
	start: 'justify-start',
	center: 'justify-center',
	end: 'justify-end',
	between: 'justify-between',
	around: 'justify-around',
	evenly: 'justify-evenly',
} as const

export const gapMap = {
	0: 'gap-0',
	1: 'gap-1',
	2: 'gap-2',
	3: 'gap-3',
	4: 'gap-4',
	5: 'gap-5',
	6: 'gap-6',
	8: 'gap-8',
	10: 'gap-10',
	12: 'gap-12',
	16: 'gap-16',
} as const

export type StackDirection = keyof typeof directionMap
export type StackAlign = keyof typeof alignMap
export type StackJustify = keyof typeof justifyMap
export type StackGap = keyof typeof gapMap
