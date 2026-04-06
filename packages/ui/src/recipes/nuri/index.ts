/**
 * Nuri (塗り) — Painted fills.
 *
 * Deliberate application of color — the pigment chosen for a specific element.
 * Each child maps color names to CSS custom property values for CVA variants.
 *
 * Tier: 1
 * Concern: color
 */

import { extendSoft, extendSolid, soft, solid } from './badge'
import { buttonOutline, buttonSoft, buttonSolid, buttonSolidBase } from './button'
import { checkbox } from './checkbox'
import { chipSolidActive } from './chip'
import { outline, text } from './palette'
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
	soft,
	solid,
	outline,
	text,
	extend: { soft: extendSoft, solid: extendSolid },

	// ── Button ───────────────────────────────────────────
	buttonSolid,
	buttonSolidBase,
	buttonSoft,
	buttonOutline,

	// ── Chip (active-state override) ─────────────────────
	chipSolidActive,

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
