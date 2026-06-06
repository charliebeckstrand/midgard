/**
 * Kokkaku (骨格) — skeletal frames.
 *
 * Skeleton placeholder dimensions per component — stripped of chrome,
 * variant, and colour so placeholders track the real component's
 * silhouette. One file per unit; this barrel assembles the named
 * bundle that every kata reads as `skeleton: kokkaku.<name>`.
 */

import { avatar } from './avatar'
import { badge } from './badge'
import { button } from './button'
import { checkbox } from './checkbox'
import { control } from './control'
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
	control,
	heading,
	radio,
	switch: switchRecipe,
	text,
	textarea,
} as const
