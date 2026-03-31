import { cva, type VariantProps } from 'class-variance-authority'
import { katachi, ki, narabi, omote, sumi } from '../../recipes'

export const sheetPanelVariants = cva([omote.panel, 'fixed flex flex-col p-6'], {
	variants: {
		side: {
			right: narabi.slide.right,
			left: narabi.slide.left,
			top: narabi.slide.top,
			bottom: narabi.slide.bottom,
		},
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
		side: 'right',
		size: 'md',
	},
})

export const sheetTitleVariants = cva([sumi.base, 'text-lg/7 font-semibold'])

export const sheetDescriptionVariants = cva([sumi.usui, 'text-base/6'])

export const sheetBodyVariants = cva('mt-4 flex-1 overflow-y-auto')

export const sheetActionsVariants = cva('mt-6 flex items-center justify-end gap-3')

export const sheetCloseVariants = cva([
	'absolute right-4 top-4 rounded-md p-1',
	sumi.usui,
	'hover:text-zinc-500 dark:hover:text-zinc-400',
	ki.reset,
	ki.offset,
])

export type SheetPanelVariants = VariantProps<typeof sheetPanelVariants>
