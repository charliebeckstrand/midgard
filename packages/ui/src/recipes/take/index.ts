/**
 * Take (丈) — Measure.
 *
 * Pure dimension scales — width, height, and the icon-slot size grid.
 * Typography lives in `ji`; gaps live in `kumi`; padding lives in `ma`.
 * Density presets (button / compact / control) live with their component in
 * `katachi`, composed from these primitives.
 *
 * Tier: 1 · Concern: sizing
 */

import { avatar } from './avatar'
import { combobox } from './combobox'
import { listbox } from './listbox'
import { mark } from './mark'
import { panel } from './panel'
import { popup } from './popup'
import { scrollArea } from './scroll-area'

/** Icon slot — sizes `data-slot="icon"` children per density step. */
export const icon = {
	xs: '*:data-[slot=icon]:size-3 *:data-[slot=icon]:shrink-0',
	sm: '*:data-[slot=icon]:size-4 *:data-[slot=icon]:shrink-0',
	md: '*:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0',
	lg: '*:data-[slot=icon]:size-6 *:data-[slot=icon]:shrink-0',
}

export const take = {
	icon,
	avatar,
	panel,
	popup,
	scrollArea,
	combobox,
	listbox,
	/** Inline-code / kbd sizing — base + size map. */
	mark,
} as const

export namespace take {
	export type IconSize = keyof typeof take.icon
	export type MarkSize = keyof typeof take.mark.size
	export type AvatarSize = keyof typeof take.avatar
	export type PanelSize =
		| 'xs'
		| 'sm'
		| 'md'
		| 'lg'
		| 'xl'
		| '2xl'
		| '3xl'
		| '4xl'
		| '5xl'
		| '6xl'
		| '7xl'
}
