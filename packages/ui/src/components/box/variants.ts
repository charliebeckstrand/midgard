import type { Ma } from '../../recipes'
import type { k } from '../../recipes/kata/box'

export type BoxPadding = Ma
export type BoxMargin = Ma | 'auto'

export const paddingMap = {
	xs: 'p-1',
	sm: 'p-2',
	md: 'p-3',
	lg: 'p-4',
	xl: 'p-6',
} as const satisfies Record<BoxPadding, string>

export const pxMap = {
	xs: 'px-1',
	sm: 'px-2',
	md: 'px-3',
	lg: 'px-4',
	xl: 'px-6',
} as const satisfies Record<BoxPadding, string>

export const pyMap = {
	xs: 'py-1',
	sm: 'py-2',
	md: 'py-3',
	lg: 'py-4',
	xl: 'py-6',
} as const satisfies Record<BoxPadding, string>

export const marginMap = {
	xs: 'm-1',
	sm: 'm-2',
	md: 'm-3',
	lg: 'm-4',
	xl: 'm-6',
	auto: 'm-auto',
} as const satisfies Record<BoxMargin, string>

export const mxMap = {
	xs: 'mx-1',
	sm: 'mx-2',
	md: 'mx-3',
	lg: 'mx-4',
	xl: 'mx-6',
	auto: 'mx-auto',
} as const satisfies Record<BoxMargin, string>

export const myMap = {
	xs: 'my-1',
	sm: 'my-2',
	md: 'my-3',
	lg: 'my-4',
	xl: 'my-6',
	auto: 'my-auto',
} as const satisfies Record<BoxMargin, string>

export const radiusMap = {
	none: 'rounded-none',
	sm: 'rounded-sm',
	md: 'rounded-md',
	lg: 'rounded-lg',
	xl: 'rounded-xl',
	full: 'rounded-full',
} as const

export type BoxBg = keyof typeof k.bg
export type BoxOutline = boolean | keyof typeof k.outline
export type BoxRadius = keyof typeof radiusMap
