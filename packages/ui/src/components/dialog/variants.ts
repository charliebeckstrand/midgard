import { cva, type VariantProps } from 'class-variance-authority'
import { katachi, omote, sumi } from '../../recipes'

export const dialogPanelVariants = cva([omote.panel, 'relative w-full rounded-2xl p-6'], {
	variants: {
		size: {
			xs: katachi.panel.xs,
			sm: katachi.panel.sm,
			md: katachi.panel.md,
			lg: katachi.panel.lg,
			xl: katachi.panel.xl,
			'2xl': katachi.panel['2xl'],
			'3xl': katachi.panel['3xl'],
			'4xl': katachi.panel['4xl'],
			'5xl': katachi.panel['5xl'],
			'6xl': katachi.panel['6xl'],
			'7xl': katachi.panel['7xl'],
		},
	},
	defaultVariants: {
		size: 'lg',
	},
})

export const dialogTitleVariants = cva([sumi.base, 'text-lg/7 font-semibold'])

export const dialogDescriptionVariants = cva([sumi.usui, 'text-base/6'])

export const dialogBodyVariants = cva('mt-4')

export const dialogActionsVariants = cva('mt-6 flex items-center justify-end gap-3')

export type DialogPanelVariants = VariantProps<typeof dialogPanelVariants>
