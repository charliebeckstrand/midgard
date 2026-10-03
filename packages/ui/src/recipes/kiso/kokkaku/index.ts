/**
 * Kokkaku (骨格): skeletal frames.
 *
 * The skeleton form of each unit: the dimensions of its placeholders,
 * with no chrome, variant, or color, so that a placeholder tracks the
 * silhouette of the real component. A kata reads its form as
 * `skeleton: kokkaku.<name>`. Some kata also read a measure of the form
 * for the real component, such as the width of the calendar, so the two
 * cannot drift apart. One file per unit; this barrel assembles the named
 * bundle.
 */

import { accordion } from './accordion'
import { avatar } from './avatar'
import { badge } from './badge'
import { breadcrumb } from './breadcrumb'
import { button } from './button'
import { calendar } from './calendar'
import { chart } from './chart'
import { chat } from './chat'
import { checkbox } from './checkbox'
import { colorPanel } from './color-panel'
import { control } from './control'
import { descriptionList } from './description-list'
import { heading } from './heading'
import { list } from './list'
import { map } from './map'
import { nav } from './nav'
import { pagination } from './pagination'
import { progress } from './progress'
import { radio } from './radio'
import { rating } from './rating'
import { segment } from './segment'
import { slider } from './slider'
import { sparkline } from './sparkline'
import { stat } from './stat'
import { stepper } from './stepper'
import { switchRecipe } from './switch'
import { tabs } from './tabs'
import { text } from './text'
import { textarea } from './textarea'
import { timeline } from './timeline'
import { toggleIconButton } from './toggle-icon-button'

export const kokkaku = {
	accordion,
	avatar,
	badge,
	breadcrumb,
	button,
	calendar,
	chart,
	chat,
	checkbox,
	colorPanel,
	control,
	descriptionList,
	heading,
	list,
	map,
	nav,
	pagination,
	progress,
	radio,
	rating,
	segment,
	slider,
	sparkline,
	stat,
	stepper,
	switch: switchRecipe,
	tabs,
	text,
	textarea,
	timeline,
	toggleIconButton,
} as const
