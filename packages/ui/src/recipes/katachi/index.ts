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

import { activeIndicator } from './active-indicator'
import { alert } from './alert'
import { avatar } from './avatar'
import { badge } from './badge'
import { breadcrumb } from './breadcrumb'
import { button } from './button'
import { calendar } from './calendar'
import { card } from './card'
import { checkbox } from './checkbox'
import { chip } from './chip'
import { combobox } from './combobox'
import { dialog } from './dialog'
import { disclosure } from './disclosure'
import { divider } from './divider'
import { dl } from './dl'
import { dropdown } from './dropdown'
import { fieldset } from './fieldset'
import { grid } from './grid'
import { heading } from './heading'
import { input } from './input'
import { listbox } from './listbox'
import { navbar } from './navbar'
import { option } from './option'
import { pagination } from './pagination'
import { panel } from './panel'
import { placeholder } from './placeholder'
import { popover } from './popover'
import { progress } from './progress'
import { radio } from './radio'
import { select } from './select'
import { sheet } from './sheet'
import { sidebar } from './sidebar'
import { status } from './status'
import { switchRecipe } from './switch'
import { table } from './table'
import { tabs } from './tabs'
import { text } from './text'
import { textarea } from './textarea'
import { timeline } from './timeline'
import { toast } from './toast'
import { tooltip } from './tooltip'

export const katachi = {
	activeIndicator,
	alert,
	avatar,
	badge,
	breadcrumb,
	button,
	calendar,
	card,
	checkbox,
	chip,
	combobox,
	dialog,
	disclosure,
	divider,
	dl,
	dropdown,
	fieldset,
	grid,
	heading,
	input,
	listbox,
	navbar,
	option,
	pagination,
	panel,
	placeholder,
	popover,
	progress,
	radio,
	select,
	sheet,
	sidebar,
	status,
	switch: switchRecipe,
	table,
	tabs,
	text,
	textarea,
	timeline,
	toast,
	tooltip,
} as const
