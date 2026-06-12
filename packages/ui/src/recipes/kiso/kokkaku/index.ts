/**
 * Kokkaku (骨格): skeletal frames.
 *
 * Skeleton placeholder dimensions per component, stripped of chrome,
 * variant, and colour; placeholders track the real component's
 * silhouette. One file per unit; this barrel assembles the named
 * bundle that every kata reads as `skeleton: kokkaku.<name>`.
 */

import { avatar } from './avatar'
import { badge } from './badge'
import { breadcrumb } from './breadcrumb'
import { button } from './button'
import { calendar } from './calendar'
import { checkbox } from './checkbox'
import { colorPanel } from './color-panel'
import { control } from './control'
import { heading } from './heading'
import { pagination } from './pagination'
import { progress } from './progress'
import { radio } from './radio'
import { segment } from './segment'
import { slider } from './slider'
import { stepper } from './stepper'
import { switchRecipe } from './switch'
import { tabs } from './tabs'
import { text } from './text'
import { textarea } from './textarea'
import { toggleIconButton } from './toggle-icon-button'

export const kokkaku = {
	avatar,
	badge,
	breadcrumb,
	button,
	calendar,
	checkbox,
	colorPanel,
	control,
	heading,
	pagination,
	progress,
	radio,
	segment,
	slider,
	stepper,
	switch: switchRecipe,
	tabs,
	text,
	textarea,
	toggleIconButton,
} as const
