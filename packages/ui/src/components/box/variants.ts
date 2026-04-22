import { maru, omote, sen } from '../../recipes'

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

export const bgMap = {
	none: 'bg-transparent',
	surface: omote.surface,
	tint: omote.tint,
	panel: omote.panel.bg,
	popover: omote.popover,
	glass: omote.glass,
} as const

export const outlineMap = {
	default: sen.outline,
	subtle: sen.outlineSubtle,
	strong: sen.outlineStrong,
} as const

export const radiusMap = {
	none: maru.rounded.none,
	sm: maru.rounded.sm,
	md: maru.rounded.md,
	lg: maru.rounded.lg,
	xl: maru.rounded.xl,
	full: maru.rounded.full,
} as const

export type BoxBg = keyof typeof bgMap
export type BoxOutline = boolean | keyof typeof outlineMap
export type BoxRadius = keyof typeof radiusMap
