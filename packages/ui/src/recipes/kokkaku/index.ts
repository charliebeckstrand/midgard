/**
 * Kokkaku (骨格) — Skeletal frames.
 *
 * Skeleton placeholder dimensions per component — stripped of chrome, variant,
 * and color so placeholders track the real component.
 *
 * Tier: 3 · Concern: skeleton form
 */

import { avatar } from './avatar'
import { badge } from './badge'
import { button } from './button'
import { checkbox } from './checkbox'
import { formControl } from './form-control'
import { heading } from './heading'
import { radio } from './radio'
import { switchRecipe } from './switch'
import { text } from './text'
import { textarea } from './textarea'

export const kokkaku = {
	avatar,
	badge,
	button,
	checkbox,
	formControl,
	heading,
	radio,
	switch: switchRecipe,
	text,
	textarea,
} as const
