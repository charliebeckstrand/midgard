import { kage, maru } from '../../recipes'

export const radius = maru.rounded

export {
	type Margin as AreaMargin,
	marginMap,
	mxMap,
	myMap,
	type Padding as AreaPadding,
	paddingMap,
	pxMap,
	pyMap,
} from '../../recipes/ma'

export const borderMap = {
	solid: kage.border,
	dashed: [kage.border, 'border-dashed'],
} as const

export type AreaBorder = keyof typeof borderMap
