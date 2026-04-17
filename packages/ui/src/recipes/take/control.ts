import { text } from './density'

/**
 * Form control density — same height as buttons at each step.
 *
 *   step   height   px      py      text
 *   ─────  ──────   ──────  ──────  ──────────
 *   sm     28px     10px    6px     12px/16px
 *   md     36px     12px    8px     14px/20px
 *   lg     44px     14px    10px    16px/24px
 */
export const density = {
	sm: ['px-[calc(--spacing(2.5)-1px)] py-[calc(--spacing(1.5)-1px)]', text.sm],
	md: ['px-[calc(--spacing(3)-1px)] py-[calc(--spacing(2)-1px)]', text.md],
	lg: ['px-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(2.5)-1px)]', text.lg],
}

const icon = ['flex items-center', 'pr-2', 'pointer-events-none']

export const control = {
	icon,
	sm: density.sm,
	md: density.md,
	lg: density.lg,
} as const
