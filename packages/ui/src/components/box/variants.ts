import { kage, maru, omote } from '../../recipes'

export {
	type Margin as BoxMargin,
	marginMap,
	mxMap,
	myMap,
	type Padding as BoxPadding,
	paddingMap,
	pxMap,
	pyMap,
} from '../../recipes/ma'

export const radiusMap = {
	none: maru.roundedNone,
	sm: maru.roundedSm,
	md: maru.roundedMd,
	lg: maru.rounded,
	xl: maru.roundedXl,
	'2xl': maru.rounded2xl,
	full: maru.roundedFull,
} as const

export const bgMap = {
	none: '',
	surface: omote.surface,
	tint: omote.tint,
	panel: omote.panel.bg,
} as const

export const borderMap = {
	subtle: kage.borderSubtle,
	default: kage.border,
	strong: kage.borderStrong,
} as const

export type BoxRadius = keyof typeof radiusMap
export type BoxBg = keyof typeof bgMap
export type BoxBorder = boolean | keyof typeof borderMap
