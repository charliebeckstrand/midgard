/**
 * Katachi (形) — Component forms.
 *
 * The complete styling recipe for each component — base classes, variant maps,
 * slot styles, and defaults. Variant files become thin CVA plumbing that maps
 * katachi entries into cva() calls.
 *
 * Sizing, spacing, and gap belong in take — not here. Katachi handles
 * structure, visual styling, and composition of lower-tier recipes.
 *
 * Tier: 3
 * Concern: component form
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
import { option } from './option'
import { otpInput } from './otp-input'
import { pagination } from './pagination'
import { panel } from './panel'
import { placeholder } from './placeholder'
import { popover } from './popover'
import { progress } from './progress'
import { radio } from './radio'
import { scrollArea } from './scroll-area'
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
	datepicker,
	dialog,
	drawer,
	divider,
	dl,
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
	option,
	otpInput,
	pagination,
	panel,
	placeholder,
	popover,
	progress,
	radio,
	scrollArea,
	select,
	sheet,
	sidebar,
	slider,
	spinner,
	stat,
	status,
	stepper,
	switch: switchRecipe,
	tagInput,
	table,
	tabs,
	text,
	textarea,
	timeline,
	toast,
	tooltip,
	tree,
} as const
