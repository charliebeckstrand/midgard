/**
 * Take (丈) — Measure.
 *
 * The proportions of a thing — how compact or generous, what scale.
 *
 * Tier: 1
 * Concern: sizing
 */

import { avatar } from './avatar'
import { button, buttonWithIcon, buttonWithIconSize, buttonWithKbd } from './button'
import { combobox } from './combobox'
import { compact } from './compact'
import { control } from './control'
import { gap, iconSlot, px, py, text } from './density'
import { listbox } from './listbox'
import { panel } from './panel'
import { popup } from './popup'
import { scrollArea } from './scroll-area'

export const take = {
	// Core density tokens
	px,
	py,
	gap,
	text,

	// Icon slot (applies to data-slot="icon" children)
	iconSlot,

	// Button
	button,
	buttonWithIcon,
	buttonWithKbd,
	buttonWithIconSize,

	// Badge and chip share the same compact density scale
	badge: compact,
	chip: compact,

	// Form controls
	control,
	combobox,
	listbox,

	// Avatar
	avatar,

	// Popup
	popup,

	// Panel
	panel,

	// Scroll area
	scrollArea,
} as const

export namespace take {
	export type BadgeSize = keyof typeof take.badge
	export type ChipSize = keyof typeof take.chip
	export type ButtonSize = keyof typeof take.button
	export type ControlSize = keyof typeof take.control
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
