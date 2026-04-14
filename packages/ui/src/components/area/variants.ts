import { kage, maru } from '../../recipes'

export const radius = maru.rounded

export const paddingMap = {
	sm: 'p-2',
	md: 'p-3',
	lg: 'p-5',
} as const

export const borderMap = {
	solid: kage.border,
	dashed: [kage.border, 'border-dashed'],
} as const

export type AreaPadding = keyof typeof paddingMap
export type AreaBorder = keyof typeof borderMap
