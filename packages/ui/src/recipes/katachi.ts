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

import { form } from '../primitives/form'
import { kage } from './kage'
import { ki } from './ki'
import { maru } from './maru'
import { narabi } from './narabi'
import { nuri } from './nuri'
import { omote } from './omote'
import { sawari } from './sawari'
import { sumi } from './sumi'
import { take } from './take'
import { yasumi } from './yasumi'

// ── Export ───────────────────────────────────────────────

export const katachi = {
	// ─── Active Indicator ────────────────────────────────

	activeIndicator: [maru.rounded, 'absolute inset-0', omote.tint],

	// ─── Avatar ──────────────────────────────────────────

	avatar: {
		base: [
			'inline-grid place-items-center overflow-hidden align-middle text-white *:col-start-1 *:row-start-1',
			maru.roundedFull,
			nuri.avatar,
		],
		size: take.avatar,
		defaults: { size: 'md' as const },
		initials: 'select-none fill-current text-[48px] font-medium uppercase',
		image: 'size-full object-cover',
		button: [ki.offset, 'relative', sawari.cursor, maru.roundedFull],
	},

	// ─── Badge ───────────────────────────────────────────

	badge: {
		base: 'group inline-flex items-center font-medium',
		variant: {
			solid: {
				base: ['border border-transparent', maru.roundedMd],
				color: nuri.badgeSolid,
			},
			soft: {
				base: ['border border-transparent', maru.roundedMd],
				color: nuri.badgeSoft,
			},
			outline: {
				base: ['border', maru.roundedMd],
				color: nuri.outline,
			},
		},
		size: take.badge,
		defaults: { variant: 'soft' as const, color: 'zinc' as const, size: 'md' as const },
	},

	// ─── Button ──────────────────────────────────────────

	button: {
		base: [
			'relative isolate inline-flex items-center justify-center font-semibold',
			maru.rounded,
			ki.ring,
			yasumi.disabled,
			sawari.cursor,
			'after:absolute after:inset-0 after:-z-10 after:rounded-[inherit]',
		],
		variant: {
			solid: {
				base: ['border border-transparent', kage.shadow, sawari.hover, 'disabled:shadow-none'],
				color: nuri.buttonSolid,
			},
			soft: {
				base: ['border border-transparent', sawari.hover, sumi.fillIcon],
				color: nuri.buttonSoft,
			},
			outline: {
				base: [kage.borderStrong, sumi.text, omote.surface, sawari.hover, sumi.fillIcon],
				color: nuri.buttonOutline,
			},
			plain: {
				base: ['border border-transparent', sumi.text, sawari.hover, sumi.fillIcon],
				color: nuri.buttonPlain,
			},
			ghost: {
				base: ['border border-transparent', sumi.text, sumi.fillIcon],
				color: nuri.buttonPlain,
			},
		},
		size: take.button,
		iconOnly: take.buttonIcon,
		iconOnlyBase: 'p-0 gap-0',
		defaults: { variant: 'solid' as const, color: 'zinc' as const, size: 'md' as const },
	},

	// ─── Checkbox ────────────────────────────────────────

	checkbox: {
		color: nuri.checkbox,
		base: [
			...form.check,
			'rounded-[--spacing(1)]',
			'checked:border-transparent checked:bg-(--checkbox-checked-bg)',
			'checked:border-(--checkbox-checked-border)',
		],
	},

	// ─── Chip ────────────────────────────────────────────

	chip: {
		base: [
			'group inline-flex items-center font-medium select-none',
			maru.roundedFull,
			sawari.cursor,
			ki.ring,
		],
		variant: {
			solid: {
				base: 'border border-transparent',
				color: nuri.solid,
				active: nuri.solid,
			},
			soft: {
				base: 'border border-transparent',
				color: nuri.soft,
				active: nuri.solid,
			},
			outline: {
				base: 'border',
				color: nuri.outline,
				active: nuri.chipOutlineActive,
			},
			plain: {
				base: 'border border-transparent',
				color: nuri.text,
				active: nuri.soft,
			},
		},
		size: take.chip,
		defaults: {
			variant: 'outline' as const,
			color: 'zinc' as const,
			size: 'md' as const,
			active: false as const,
		},
	},

	// ─── Combobox ────────────────────────────────────────

	combobox: {
		input: [...form.inputBase, maru.rounded, take.control.md, 'pr-8 pl-3'],
		chevron: narabi.chevron,
		options: take.popup,
		option: [...sawari.item, ...narabi.item],
	},

	// ─── Dialog ──────────────────────────────────────────

	dialog: {
		panel: {
			base: [
				omote.panel,
				'relative w-full p-6',
				'max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:max-h-[calc(85dvh)] max-sm:overflow-y-auto',
				'sm:rounded-2xl',
			],
			size: take.panel,
			defaults: { size: 'lg' as const },
		},
	},

	// ─── Divider ─────────────────────────────────────────

	divider: {
		base: 'border-0',
		orientation: {
			horizontal: 'w-full border-t',
			vertical: 'self-stretch border-l',
		},
		soft: {
			true: kage.borderSubtle,
			false: kage.border,
		},
		defaults: { orientation: 'horizontal' as const, soft: false as const },
	},

	// ─── Description List ────────────────────────────────

	dl: {
		base: 'grid grid-cols-1 text-sm/6 sm:grid-cols-[min(50%,--spacing(56))_auto]',
		term: [
			sumi.textMuted,
			kage.borderSubtleColor,
			'col-start-1 border-t pt-3 first:border-none first:pt-0',
			'sm:py-3 sm:first:pt-0',
			'font-medium',
		],
		details: [
			sumi.text,
			kage.borderSubtleColor,
			'pb-3 pt-1',
			'sm:border-t sm:py-3',
			'sm:nth-2:border-none sm:nth-2:pt-0',
		],
	},

	// ─── Dropdown ────────────────────────────────────────

	dropdown: {
		menu: ['w-max min-w-48', take.popup],
		item: [
			'group/option flex w-full items-center gap-3 px-3.5 py-2.5 sm:px-3 sm:py-1.5',
			...sawari.item,
			...narabi.item,
		],
		section: 'first:pt-0 last:pb-0',
		heading: [sumi.textMuted, 'px-3.5 pb-1 pt-2 text-xs/5 font-medium sm:px-3'],
		label: 'truncate',
		description: [sumi.textMuted, narabi.description, sawari.focusText],
		shortcut: [sumi.textMuted, 'ml-auto pl-4 text-xs/5', sawari.focusTextMuted],
		separator: kage.divider,
	},

	// ─── Fieldset ────────────────────────────────────────

	fieldset: {
		base: ['[&>legend+*]:pt-6', yasumi.disabled],
		legend: [sumi.text, 'text-base/6 font-semibold', yasumi.disabled],
		field: [...narabi.field, yasumi.disabled],
		label: [sumi.text, 'text-base/6 select-none', yasumi.disabled],
		description: [sumi.textMuted, 'text-base/6', yasumi.disabled],
		error: [sumi.textError, 'text-base/6', yasumi.disabled],
	},

	// ─── Grid ────────────────────────────────────────────

	grid: {
		divider: {
			base: 'border-0 border-t col-span-full',
			soft: {
				true: kage.borderSubtle,
				false: kage.border,
			},
			defaults: { soft: false as const },
		},
	},

	// ─── Heading ─────────────────────────────────────────

	heading: {
		base: sumi.text,
		level: {
			1: 'text-3xl/9 font-bold tracking-tight',
			2: 'text-2xl/8 font-semibold tracking-tight',
			3: 'text-xl/7 font-semibold tracking-tight',
			4: 'text-lg/6 font-semibold',
			5: 'text-base/6 font-medium',
			6: 'text-sm/5 font-medium',
		},
		defaults: { level: 1 as const },
	},

	// ─── Input ───────────────────────────────────────────

	input: {
		base: form.input,
		variant: {
			default: [],
			outline: kage.borderEmphasis,
		},
		defaults: { variant: 'default' as const },
		date: form.date,
	},

	// ─── Listbox ─────────────────────────────────────────

	listbox: {
		button: [
			...form.inputBase,
			maru.rounded,
			take.control.md,
			'appearance-none pr-8 pl-3',
			'text-left',
		],
		options: take.popup,
		value: 'block truncate',
		chevron: ['pointer-events-none', narabi.chevron],
		option: [...sawari.item, ...narabi.item],
	},

	// ─── Navbar ──────────────────────────────────────────

	navbar: {
		base: 'flex items-center gap-3 px-4 py-2.5',
		item: [
			...sawari.navItem,
			maru.rounded,
			'group relative flex items-center gap-2 px-2 py-1 text-sm/6 font-medium',
			sawari.cursor,
		],
		section: 'flex items-center gap-3',
		label: [sumi.textMuted, 'text-sm/6'],
		spacer: 'flex-1',
	},

	// ─── Pagination ──────────────────────────────────────

	pagination: {
		base: 'flex list-none gap-1',
		list: 'flex list-none items-center gap-1 m-0 p-0',
		page: {
			base: [
				ki.ring,
				maru.rounded,
				'relative inline-flex min-w-9 items-center justify-center px-2 py-1.5 text-sm/6 font-medium',
				sawari.cursor,
				'before:absolute before:inset-px before:rounded-[calc(var(--radius-lg)-1px)]',
			],
			current: {
				true: [sumi.text, omote.tintBefore],
				false: [sumi.textMuted, sumi.textHover],
			},
			defaults: { current: false as const },
		},
		gap: [
			sumi.textMuted,
			'inline-flex min-w-9 items-center justify-center text-sm/6',
			'select-none',
		],
		nav: [
			ki.ring,
			sumi.textMuted,
			sumi.textHover,
			maru.rounded,
			yasumi.disabled,
			'inline-flex items-center justify-center gap-1 px-2 py-1.5 text-sm/6 font-medium',
			sawari.cursor,
		],
	},

	// ─── Panel (shared slots for Dialog/Sheet) ───────────

	panel: {
		title: [sumi.text, 'text-lg/7 font-semibold'],
		description: [sumi.textMuted, 'text-base/6'],
		body: 'mt-4',
		actions: 'mt-6 flex items-center justify-end gap-3',
	},

	// ─── Placeholder ─────────────────────────────────────

	placeholder: {
		base: omote.skeleton,
		variant: {
			line: 'h-4 w-full rounded',
			circle: maru.roundedFull,
			rect: ['w-full', maru.rounded],
		},
		defaults: { variant: 'line' as const },
	},

	// ─── Radio ───────────────────────────────────────────

	radio: {
		color: nuri.radio,
		base: [
			...form.check,
			maru.roundedFull,
			'checked:border-transparent checked:bg-(--radio-checked-bg)',
			'checked:border-(--radio-checked-border)',
		],
	},

	// ─── Select ──────────────────────────────────────────

	select: {
		base: [
			...form.input,
			'appearance-none',
			'pr-[calc(--spacing(10))]',
			'dark:[color-scheme:dark]', // native browser hint for select dropdowns
		],
	},

	// ─── Sheet ───────────────────────────────────────────

	sheet: {
		panel: {
			base: [
				omote.panel,
				'fixed flex flex-col overflow-y-auto rounded-xl',
				'max-sm:inset-x-0 max-sm:bottom-0 max-sm:w-full max-sm:max-h-[calc(75dvh)] max-sm:rounded-b-none',
			],
			side: {
				right: 'sm:top-4 sm:right-4 sm:bottom-4 sm:w-full',
				left: 'sm:top-4 sm:left-4 sm:bottom-4 sm:w-full',
				top: narabi.slide.top,
				bottom: narabi.slide.bottom,
			},
			size: take.panel,
			defaults: { side: 'right' as const, size: 'md' as const },
		},
		title: [sumi.text, 'text-lg/7 font-semibold', 'px-6 pt-6'],
		description: [sumi.textMuted, 'text-base/6', 'px-6'],
		actions: ['mt-6 flex items-center justify-end gap-3', 'px-6 pb-6'],
		body: 'mt-4 flex-1 overflow-y-auto px-6',
		close: [sumi.textMuted, ki.offset, 'absolute right-4 top-4', maru.roundedMd, 'p-1'],
	},

	// ─── Sidebar ─────────────────────────────────────────

	sidebar: {
		base: 'flex h-full flex-col gap-y-4 overflow-y-auto p-4',
		item: [
			...sawari.navItem,
			maru.rounded,
			'group relative flex w-full items-center gap-3 px-2 py-2',
			'text-left font-medium',
			sawari.cursor,
		],
		section: 'flex flex-col gap-0.5',
		label: [sumi.textMuted, 'truncate', nuri.sidebarLabel],
		header: 'flex items-center gap-2',
		body: 'flex flex-1 flex-col gap-4 overflow-y-auto',
		divider: kage.divider,
		footer: 'mt-auto sticky bottom-0 flex flex-col gap-0.5',
	},

	// ─── Switch ──────────────────────────────────────────

	switch: {
		color: nuri.switch,
		base: [
			...form.hidden,
			maru.roundedFull,
			nuri.switchTrack,
			'checked:bg-(--switch-bg) checked:ring-(--switch-bg-ring) checked:ring-inset',
			nuri.switchHover,
		],
		thumb: [
			'pointer-events-none absolute top-1 left-1 inline-block size-4',
			maru.roundedFull,
			nuri.switchThumb,
			kage.shadow,
			'transition-[left] duration-200 ease-in-out',
		],
	},

	// ─── Table ───────────────────────────────────────────

	table: {
		base: 'w-full text-left text-base/6',
		head: sumi.textMuted,
		header: [
			'border-b font-semibold',
			take.px.md,
			take.py.md,
			kage.borderSubtleColor,
			sumi.textMuted,
		],
		row: ['border-b last:border-b-0', kage.borderSubtleColor],
		cell: [take.px.md, take.py.md, sumi.text],
		grid: ['border-l first:border-l-0', kage.borderSubtleColor],
		striped: nuri.tableStriped,
	},

	// ─── Tabs ────────────────────────────────────────────

	tabs: {
		list: ['flex gap-4', 'border-b', kage.borderSubtleColor],
		tab: [
			...sawari.tab,
			'relative flex items-center gap-2 px-1 py-3 font-medium',
			'outline-none',
			'after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full',
			'after:bg-transparent',
			ki.indicator,
			sawari.cursor,
		],
		indicator: ['inset-x-0 -bottom-px top-auto h-0.5', maru.roundedFull, nuri.tabIndicator],
	},

	// ─── Text ────────────────────────────────────────────

	text: {
		variant: {
			default: sumi.text,
			muted: sumi.textMuted,
			error: sumi.textError,
		},
		defaults: { variant: 'default' as const },
	},

	// ─── Textarea ────────────────────────────────────────

	textarea: {
		base: [form.input, 'min-h-9'],
		resize: {
			none: 'resize-none',
			vertical: 'resize-y',
			horizontal: 'resize-x',
		},
		defaults: { resize: 'none' as const },
	},

	// ─── Option (shared primitive) ───────────────────────

	option: {
		base: [
			'group/option grid w-full items-baseline gap-x-2',
			maru.rounded,
			sawari.cursor,
			sawari.item,
		],
		start:
			'grid-cols-[--spacing(5)_1fr] pr-3.5 pl-2 sm:grid-cols-[--spacing(4)_1fr] sm:pr-3 sm:pl-1.5',
		end: 'grid-cols-[1fr_--spacing(5)] pr-2 pl-3.5 sm:grid-cols-[1fr_--spacing(4)] sm:pr-2 sm:pl-3',
		content: ['flex min-w-0 items-center', narabi.item],
		label: 'ml-2.5 truncate first:ml-0 sm:ml-2 sm:first:ml-0',
		description: [narabi.description, sumi.textMuted, sawari.focusText],
	},
} as const
