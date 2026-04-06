/**
 * Take (丈) — Measure.
 *
 * The proportions of a thing — how compact or generous, what scale.
 *
 * Tier: 1
 * Concern: sizing
 */

// ── Motoi (基) ──────────────────────────────────────────
// Core density scale — the foundation all components reference.
//
//   step   height   px    py    gap   icon    text
//   ─────  ──────   ────  ────  ────  ──────  ──────────
//   sm     28px     6px   6px   4px   16px    12px/16px
//   md     36px     8px   8px   4px   20px    14px/20px
//   lg     44px     12px  10px  8px   20px    16px/24px

const motoi = {
	px: { sm: 'px-1.5', md: 'px-2', lg: 'px-3' },
	py: { sm: 'py-1.5', md: 'py-2', lg: 'py-2.5' },
	gap: { sm: 'gap-1', md: 'gap-1', lg: 'gap-2' },
	text: { sm: 'text-xs/4', md: 'text-sm/5', lg: 'text-base/6' },
	icon: { sm: 'size-4', md: 'size-5', lg: 'size-5' },
}

// Icon slot — applies sizing to data-slot="icon" children
const iconSlot = {
	sm: `*:data-[slot=icon]:${motoi.icon.sm} *:data-[slot=icon]:shrink-0`,
	md: `*:data-[slot=icon]:${motoi.icon.md} *:data-[slot=icon]:shrink-0`,
	lg: `*:data-[slot=icon]:${motoi.icon.lg} *:data-[slot=icon]:shrink-0`,
}

// Compact density — shared by badge and chip (same form factor).
// The md step intentionally diverges from motoi — tighter text size
// (xs/5 vs sm/5), narrower gap (1.5 vs 1), and smaller icon (3.5 vs 5).
const compact = {
	sm: ['px-1.5 py-0.5', motoi.gap.sm, motoi.text.sm, `*:data-[slot=icon]:${motoi.icon.sm}`],
	md: ['px-2 py-0.5', 'gap-x-1.5', 'text-xs/5', '*:data-[slot=icon]:size-3.5'],
	lg: ['px-2.5 py-1', 'gap-x-1.5', motoi.text.md, `*:data-[slot=icon]:${motoi.icon.sm}`],
} as const

// ── Export ───────────────────────────────────────────────
export const take = {
	// Core density tokens
	...motoi,

	// Icon slot (applies to data-slot="icon" children)
	iconSlot,

	// Button density (padding offset by 1px for border, includes gap + text + icon slot)
	button: {
		sm: [
			'px-[calc(--spacing(1.5)-1px)] py-[calc(--spacing(1.5)-1px)]',
			motoi.gap.sm,
			motoi.text.sm,
			iconSlot.sm,
		],
		md: [
			'px-[calc(--spacing(2)-1px)] py-[calc(--spacing(2)-1px)]',
			motoi.gap.md,
			motoi.text.md,
			iconSlot.md,
		],
		lg: [
			'px-[calc(--spacing(3)-1px)] py-[calc(--spacing(2.5)-1px)]',
			motoi.gap.lg,
			motoi.text.lg,
			iconSlot.lg,
		],
	},

	// Icon-only button dimensions (touch target slightly larger than text button)
	buttonIcon: { sm: 'size-8', md: 'size-9', lg: 'size-12' },

	// Badge and chip share the same compact density scale
	badge: compact,
	chip: compact,

	// Form control density — same height as buttons at each step
	//
	//   step   height   px      py      text
	//   ─────  ──────   ──────  ──────  ──────────
	//   sm     28px     10px    6px     12px/16px
	//   md     36px     12px    8px     14px/20px
	//   lg     44px     14px    10px    16px/24px
	control: {
		sm: ['px-[calc(--spacing(2.5)-1px)] py-[calc(--spacing(1.5)-1px)]', motoi.text.sm],
		md: ['px-[calc(--spacing(3)-1px)] py-[calc(--spacing(2)-1px)]', motoi.text.md],
		lg: ['px-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(2.5)-1px)]', motoi.text.lg],
	},

	// Avatar dimension scale
	avatar: {
		xs: 'size-6',
		sm: 'size-8',
		md: 'size-10',
		lg: 'size-12',
		xl: 'size-16',
	},

	// Popup list max-height (dropdown, combobox, listbox)
	popup: 'max-h-60',

	// Panel constraint scale (max-width for dialogs/sheets)
	panel: {
		xs: 'sm:max-w-xs',
		sm: 'sm:max-w-sm',
		md: 'sm:max-w-md',
		lg: 'sm:max-w-lg',
		xl: 'sm:max-w-xl',
		'2xl': 'sm:max-w-2xl',
		'3xl': 'sm:max-w-3xl',
		'4xl': 'sm:max-w-4xl',
		'5xl': 'sm:max-w-5xl',
		'6xl': 'sm:max-w-6xl',
		'7xl': 'sm:max-w-7xl',
	} satisfies Record<take.PanelSize, string>,
} as const

export namespace take {
	export type BadgeSize = keyof typeof take.badge
	export type ChipSize = keyof typeof take.chip
	export type ButtonSize = keyof typeof take.button
	export type ControlSize = keyof typeof take.control
	export type AvatarSize = keyof typeof take.avatar
	export type PanelSize =
		| 'xs'
		| 'sm'
		| 'md'
		| 'lg'
		| 'xl'
		| '2xl'
		| '3xl'
		| '4xl'
		| '5xl'
		| '6xl'
		| '7xl'
}
