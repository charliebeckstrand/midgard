/**
 * Nuri (塗り) — Painted fills.
 *
 * Deliberate application of color — the pigment chosen for a specific element.
 * Each child maps color names to CSS custom property values for CVA variants.
 *
 * Tier: 1
 * Concern: color
 */

import { badgeSoft, badgeSolid, outline, soft, solid } from './badge'
import { buttonOutline, buttonPlain, buttonSoft, buttonSolid } from './button'
import { checkbox } from './checkbox'
import { chipOutlineActive } from './chip'
import { text } from './palette'
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
	// ── Shared color variants ────────────────────────────
	solid,
	soft,
	outline,
	text,
	badgeSolid,
	badgeSoft,

	// ── Button ───────────────────────────────────────────
	buttonSolid,
	buttonSoft,
	buttonOutline,
	buttonPlain,

	// ── Chip ────────────────────────────────────────────
	chipOutlineActive,

	// ── Form controls ────────────────────────────────────
	checkbox,
	radio,
	switch: switchColor,

	// ── Scalar tokens ────────────────────────────────────
	avatar,
	switchTrack,
	switchThumb,
	switchHover,
	sidebarLabel,
	tableStriped,
	tabIndicator,
} as const
