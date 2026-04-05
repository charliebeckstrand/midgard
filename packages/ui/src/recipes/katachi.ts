/**
 * Katachi (形) — Component forms.
 *
 * The complete styling recipe for each component — base classes, variant maps,
 * slot styles, and defaults. Variant files become thin CVA plumbing that maps
 * katachi entries into cva() calls.
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

	activeIndicator: [maru.rounded, 'absolute inset-0 bg-zinc-950/5 dark:bg-white/10'],

	// ─── Avatar ──────────────────────────────────────────

	avatar: {
		base: 'inline-grid place-items-center overflow-hidden rounded-full align-middle text-white *:col-start-1 *:row-start-1 bg-zinc-600 dark:bg-zinc-700',
		size: take.avatar,
		defaults: { size: 'md' as const },
		initials: 'select-none fill-current text-[48px] font-medium uppercase',
		image: 'size-full object-cover',
		button: [ki.offset, 'relative cursor-default rounded-full'],
	},

	// ─── Badge ───────────────────────────────────────────

	badge: {
		base: ['group inline-flex items-center gap-x-1.5 font-medium', take.icon],
		variant: {
			solid: 'rounded-md',
			soft: 'rounded-md',
		},
		colorSolid: nuri.badgeSolid,
		colorSoft: nuri.badgeSoft,
		size: take.badge,
		defaults: { variant: 'soft' as const, color: 'zinc' as const, size: 'md' as const },
	},

	// ─── Button ──────────────────────────────────────────

	button: {
		base: [
			maru.rounded,
			take.icon,
			ki.ring,
			yasumi.disabled,
			'relative isolate inline-flex items-center justify-center gap-x-2 font-semibold',
			'cursor-default',
			'after:absolute after:inset-0 after:-z-10 after:rounded-[inherit]',
		],
		variant: {
			solid: [
				'border border-transparent',
				'bg-[var(--btn-bg)]',
				'border-[var(--btn-border)]',
				'shadow-sm',
				'[--btn-hover:color-mix(in_oklab,black_10%,transparent)]',
				'[--btn-active:color-mix(in_oklab,black_15%,transparent)]',
				'dark:[--btn-hover:color-mix(in_oklab,white_10%,transparent)]',
				'dark:[--btn-active:color-mix(in_oklab,white_15%,transparent)]',
				'not-disabled:hover:after:bg-[var(--btn-hover)]',
				'active:after:bg-[var(--btn-active)]',
				'disabled:shadow-none',
				'dark:border-white/5',
				'*:data-[slot=icon]:text-[var(--btn-icon)]',
			],
			outline: [
				'border',
				'border-zinc-950/10 dark:border-white/15',
				sumi.text,
				'bg-white dark:bg-zinc-900',
				'not-disabled:hover:after:bg-zinc-950/[0.025]',
				'dark:not-disabled:hover:after:bg-white/5',
				sumi.fillIcon,
			],
			plain: [
				'border border-transparent',
				sumi.text,
				'not-disabled:hover:after:bg-zinc-950/5',
				'dark:not-disabled:hover:after:bg-white/10',
				sumi.fillIcon,
			],
			ghost: ['border border-transparent', sumi.text, sumi.fillIcon],
		},
		color: nuri.button,
		size: take.button,
		iconOnly: { sm: 'size-8', md: 'size-10', lg: 'size-12' },
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

	// ─── Combobox ────────────────────────────────────────

	combobox: {
		input: [...form.inputBase, maru.rounded, 'py-1.5 pr-8 pl-3'],
		chevron: 'absolute inset-y-0 right-0 flex items-center pr-2',
		options: 'max-h-60',
		option: sawari.option,
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
		root: 'grid grid-cols-1 text-sm/6 sm:grid-cols-[min(50%,--spacing(56))_auto]',
		term: [
			sumi.textMuted,
			kage.borderSubtle,
			'col-start-1 border-t pt-3 first:border-none first:pt-0',
			'sm:py-3 sm:first:pt-0',
			'font-medium',
		],
		details: [
			sumi.text,
			kage.borderSubtle,
			'pb-3 pt-1',
			'sm:border-t sm:py-3',
			'sm:nth-2:border-none',
		],
	},

	// ─── Dropdown ────────────────────────────────────────

	dropdown: {
		menu: 'w-max min-w-48 max-h-60',
		item: [
			'group/option flex w-full items-center gap-3 px-3.5 py-2.5 sm:px-3 sm:py-1.5',
			sawari.option,
			take.icon,
		],
		section: 'first:pt-0 last:pb-0',
		heading: [sumi.textMuted, 'px-3.5 pb-1 pt-2 text-xs/5 font-medium sm:px-3'],
		label: 'truncate',
		description: [
			sumi.textMuted,
			'flex flex-1 overflow-hidden before:w-2 before:min-w-0 before:shrink',
			'group-focus/option:text-white',
		],
		shortcut: [sumi.textMuted, 'ml-auto pl-4 text-xs/5', 'group-focus/option:text-white/70'],
		separator: [...kage.separator, 'my-1'],
	},

	// ─── Fieldset ────────────────────────────────────────

	fieldset: {
		root: ['[&>legend+*]:pt-6', yasumi.disabled],
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
		date: form.date,
	},

	// ─── Listbox ─────────────────────────────────────────

	listbox: {
		button: [
			...form.inputBase,
			maru.rounded,
			'appearance-none py-1.5 pr-8 pl-3',
			'text-left text-base/6',
		],
		options: 'max-h-60',
		value: 'block truncate',
		chevron: 'pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2',
		option: sawari.option,
	},

	// ─── Navbar ──────────────────────────────────────────

	navbar: {
		root: 'flex items-center gap-3 px-4 py-2.5',
		item: [
			...sawari.navItem,
			maru.rounded,
			'group relative flex items-center gap-2 px-2 py-1 text-sm/6 font-medium',
			'cursor-default',
		],
		section: 'flex items-center gap-3',
		label: [sumi.textMuted, 'text-sm/6'],
		spacer: 'flex-1',
	},

	// ─── Pagination ──────────────────────────────────────

	pagination: {
		root: 'flex list-none gap-1',
		list: 'flex list-none items-center gap-1 m-0 p-0',
		page: {
			base: [
				ki.ring,
				maru.rounded,
				'relative inline-flex min-w-9 items-center justify-center px-2 py-1.5 text-sm/6 font-medium',
				'cursor-default',
				'before:absolute before:inset-px before:rounded-[calc(var(--radius-lg)-1px)]',
			],
			current: {
				true: [sumi.text, 'before:bg-zinc-950/5 dark:before:bg-white/10'],
				false: [sumi.textMuted, 'hover:text-zinc-950 dark:hover:text-white'],
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
			maru.rounded,
			'inline-flex items-center justify-center gap-1 px-2 py-1.5 text-sm/6 font-medium',
			'hover:text-zinc-950 dark:hover:text-white',
			'cursor-default',
			'disabled:opacity-50',
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
		base: 'animate-pulse bg-zinc-200 dark:bg-zinc-700',
		variant: {
			line: 'h-4 w-full rounded',
			circle: 'rounded-full',
			rect: ['w-full', maru.rounded],
		},
		defaults: { variant: 'line' as const },
	},

	// ─── Radio ───────────────────────────────────────────

	radio: {
		color: nuri.radio,
		base: [
			...form.check,
			'rounded-full',
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
			'dark:[color-scheme:dark]',
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
		close: [sumi.textMuted, ki.offset, 'absolute right-4 top-4 rounded-md p-1'],
	},

	// ─── Sidebar ─────────────────────────────────────────

	sidebar: {
		root: 'flex h-full flex-col gap-y-4 overflow-y-auto p-4',
		item: [
			...sawari.navItem,
			maru.rounded,
			'group relative flex w-full items-center gap-3 px-2 py-2',
			'text-left font-medium cursor-default',
		],
		section: 'flex flex-col gap-0.5',
		label: [
			sumi.textMuted,
			'truncate',
			'group-data-[current]:text-zinc-950 dark:group-data-[current]:text-white',
		],
		header: 'flex items-center gap-2',
		body: 'flex flex-1 flex-col gap-4 overflow-y-auto',
		divider: [...kage.separator, 'my-1'],
		footer: 'mt-auto sticky bottom-0 flex flex-col gap-0.5',
	},

	// ─── Switch ──────────────────────────────────────────

	switch: {
		color: nuri.switch,
		base: [
			...form.hidden,
			'rounded-full',
			'bg-zinc-200 ring-1 ring-zinc-950/5 ring-inset dark:bg-white/10 dark:ring-white/15',
			'checked:bg-(--switch-bg) checked:ring-(--switch-bg-ring) checked:ring-inset',
			'not-disabled:not-checked:hover:bg-zinc-300 dark:not-disabled:not-checked:hover:bg-white/15',
		],
		thumb: [
			'pointer-events-none absolute top-1 left-1 inline-block size-4 rounded-full',
			'bg-white shadow-sm ring-1 ring-zinc-950/5',
			'transition-[left] duration-200 ease-in-out',
		],
	},

	// ─── Table ───────────────────────────────────────────

	table: {
		root: 'w-full text-left text-base/6',
		head: sumi.textMuted,
		header: ['border-b px-4 py-2 font-semibold', kage.borderSubtle, sumi.textMuted],
		row: ['border-b last:border-b-0', kage.borderSubtle],
		cell: ['px-4 py-2', sumi.text],
		grid: ['border-l first:border-l-0', kage.borderSubtle],
		striped: '*:odd:bg-zinc-950/2.5 dark:*:odd:bg-white/2.5',
	},

	// ─── Tabs ────────────────────────────────────────────

	tabs: {
		list: [kage.borderSubtle, 'flex gap-4', 'border-b'],
		tab: [
			...sawari.tab,
			'relative flex items-center gap-2 px-1 py-3 font-medium',
			'outline-none',
			'after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full',
			'after:bg-transparent not-data-current:focus-visible:after:bg-blue-500',
			'cursor-default',
		],
		indicator: 'inset-x-0 -bottom-px top-auto h-0.5 rounded-full bg-zinc-950 dark:bg-white',
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
		base: [form.input, 'min-h-10'],
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
			maru.rounded,
			'group/option grid w-full cursor-default items-baseline gap-x-2',
			sawari.item,
		],
		start:
			'grid-cols-[--spacing(5)_1fr] pr-3.5 pl-2 sm:grid-cols-[--spacing(4)_1fr] sm:pr-3 sm:pl-1.5',
		end: 'grid-cols-[1fr_--spacing(5)] pr-2 pl-3.5 sm:grid-cols-[1fr_--spacing(4)] sm:pr-2 sm:pl-3',
		content: ['flex min-w-0 items-center', narabi.item],
		label: 'ml-2.5 truncate first:ml-0 sm:ml-2 sm:first:ml-0',
		description: [
			'flex flex-1 overflow-hidden before:w-2 before:min-w-0 before:shrink',
			sumi.textMuted,
			'group-focus/option:text-white',
		],
	},
} as const
