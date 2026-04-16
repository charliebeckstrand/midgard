/**
 * Katachi (形) — Component forms.
 *
 * Complete styling recipe per component — base classes, variant maps, slot styles,
 * and defaults. Structure and visual styling only; sizing lives in take.
 *
 * Tier: 3 · Concern: component form
 */

import { accordion } from './accordion'
import { activeIndicator } from './active-indicator'
import { alert } from './alert'
import { avatar } from './avatar'
import { badge } from './badge'
import { bottomNav } from './bottom-nav'
import { breadcrumb } from './breadcrumb'
import { button } from './button'
import { calendar } from './calendar'
import { card } from './card'
import { checkbox } from './checkbox'
import { chip } from './chip'
import { code } from './code'
import { collapse } from './collapse'
import { combobox } from './combobox'
import { commandPalette } from './command-palette'
import { copyButton } from './copy-button'
import { dataTable } from './data-table'
import { datepicker } from './datepicker'
import { dialog } from './dialog'
import { divider } from './divider'
import { dl } from './dl'
import { drawer } from './drawer'
import { fieldset } from './fieldset'
import { fileUpload } from './file-upload'
import { grid } from './grid'
import { heading } from './heading'
import { input } from './input'
import { kbd } from './kbd'
import { listbox } from './listbox'
import { menu } from './menu'
import { nav } from './nav'
import { navbar } from './navbar'
import { numberInput } from './number-input'
import { option } from './option'
import { pagination } from './pagination'
import { panel } from './panel'
import { placeholder } from './placeholder'
import { popover } from './popover'
import { progress } from './progress'
import { radio } from './radio'
import { resizable } from './resizable'
import { scrollArea } from './scroll-area'
import { segment } from './segment'
import { select } from './select'
import { sheet } from './sheet'
import { sidebar } from './sidebar'
import { slider } from './slider'
import { spinner } from './spinner'
import { stat } from './stat'
import { status } from './status'
import { stepper } from './stepper'
import { switchRecipe } from './switch'
import { table } from './table'
import { tabs } from './tabs'
import { tagInput } from './tag-input'
import { text } from './text'
import { textarea } from './textarea'
import { timeline } from './timeline'
import { toast } from './toast'
import { toggleIconButton } from './toggle-icon-button'
import { tooltip } from './tooltip'
import { tree } from './tree'

export const katachi = {
	accordion,
	activeIndicator,
	alert,
	avatar,
	badge,
	bottomNav,
	breadcrumb,
	button,
	calendar,
	card,
	checkbox,
	chip,
	code,
	collapse,
	combobox,
	commandPalette,
	copyButton,
	dataTable,
	datepicker,
	dialog,
	divider,
	dl,
	drawer,
	fieldset,
	fileUpload,
	grid,
	heading,
	input,
	kbd,
	listbox,
	menu,
	nav,
	navbar,
	numberInput,
	option,
	pagination,
	panel,
	placeholder,
	popover,
	progress,
	radio,
	resizable,
	scrollArea,
	segment,
	select,
	sheet,
	sidebar,
	slider,
	spinner,
	stat,
	status,
	stepper,
	switch: switchRecipe,
	table,
	tabs,
	tagInput,
	text,
	textarea,
	timeline,
	toast,
	toggleIconButton,
	tooltip,
	tree,
} as const
