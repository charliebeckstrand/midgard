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
import { colorPicker } from './color-picker'
import { control } from './control'
import { datePicker } from './date-picker'
import { descriptionList } from './description-list'
import { heading } from './heading'
import { kanban } from './kanban'
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
import { switchSkeleton } from './switch'
import { tabs } from './tabs'
import { text } from './text'
import { textarea } from './textarea'
import { timeline } from './timeline'
import { toggleIconButton } from './toggle-icon-button'
import { tree } from './tree'

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
	colorPicker,
	control,
	datePicker,
	descriptionList,
	heading,
	kanban,
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
	switch: switchSkeleton,
	tabs,
	text,
	textarea,
	timeline,
	toggleIconButton,
	tree,
} as const
