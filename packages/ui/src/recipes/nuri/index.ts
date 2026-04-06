/**
 * Nuri (塗り) — Painted fills.
 *
 * Deliberate application of color — the pigment chosen for a specific element.
 * Each child maps color names to CSS custom property values for CVA variants.
 *
 * Tier: 1
 * Concern: color
 */

import { badgeSoft, badgeSolid } from './badge'
import { button, buttonSoft, buttonSolid } from './button'
import { checkbox } from './checkbox'
import { chipBorder, chipOutlineBorder, chipSolidActive, chipText } from './chip'
import { radio } from './radio'
import { switchColor } from './switch'
import {
	avatar,
	sidebarLabel,
	switchHover,
	switchThumb,
	switchTrack,
	tabIndicator,
	tableStriped,
} from './tokens'

export const nuri = {
	checkbox,
	radio,
	switch: switchColor,
	button,
	buttonSoft,
	buttonSolid,
	badgeSoft,
	badgeSolid,
	chipBorder,
	chipOutlineBorder,
	chipText,
	chipSolidActive,
	avatar,
	switchTrack,
	switchThumb,
	switchHover,
	sidebarLabel,
	tableStriped,
	tabIndicator,
} as const
