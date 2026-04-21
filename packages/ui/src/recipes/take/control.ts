import { text } from './density'

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
