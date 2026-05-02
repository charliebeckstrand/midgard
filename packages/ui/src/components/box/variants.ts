import { omote, sen } from '../../recipes'
import type { Ma } from '../../recipes/ryu/ma'

export type BoxPadding = Ma
export type BoxMargin = Ma | 'auto'

export const paddingMap = {
	xs: 'p-xs',
	sm: 'p-sm',
	md: 'p-md',
	lg: 'p-lg',
	xl: 'p-xl',
} as const satisfies Record<BoxPadding, string>

export const pxMap = {
	xs: 'px-xs',
	sm: 'px-sm',
	md: 'px-md',
	lg: 'px-lg',
	xl: 'px-xl',
} as const satisfies Record<BoxPadding, string>

export const pyMap = {
	xs: 'py-xs',
	sm: 'py-sm',
	md: 'py-md',
	lg: 'py-lg',
	xl: 'py-xl',
} as const satisfies Record<BoxPadding, string>

export const marginMap = {
	xs: 'm-xs',
	sm: 'm-sm',
	md: 'm-md',
	lg: 'm-lg',
	xl: 'm-xl',
	auto: 'm-auto',
} as const satisfies Record<BoxMargin, string>

export const mxMap = {
	xs: 'mx-xs',
	sm: 'mx-sm',
	md: 'mx-md',
	lg: 'mx-lg',
	xl: 'mx-xl',
	auto: 'mx-auto',
} as const satisfies Record<BoxMargin, string>

export const myMap = {
	xs: 'my-xs',
	sm: 'my-sm',
	md: 'my-md',
	lg: 'my-lg',
	xl: 'my-xl',
	auto: 'my-auto',
} as const satisfies Record<BoxMargin, string>

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
	none: 'rounded-none',
	sm: 'rounded-sm',
	md: 'rounded-md',
	lg: 'rounded-lg',
	xl: 'rounded-xl',
	full: 'rounded-full',
} as const

export type BoxBg = keyof typeof bgMap
export type BoxOutline = boolean | keyof typeof outlineMap
export type BoxRadius = keyof typeof radiusMap
