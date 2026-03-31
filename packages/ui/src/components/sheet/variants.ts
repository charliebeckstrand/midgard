import { cva, type VariantProps } from 'class-variance-authority'
import { katachi, ki, narabi, omote, sumi } from '../../recipes'

export const sheetPanelVariants = cva(
	[
		omote.panel,
		'fixed flex flex-col rounded-xl p-6',
		// Mobile: always bottom sheet
		'max-sm:inset-x-0 max-sm:bottom-0 max-sm:w-full max-sm:rounded-b-none',
	],
	{
		variants: {
			side: {
				right: 'sm:top-2 sm:right-2 sm:bottom-2 sm:w-full',
				left: 'sm:top-2 sm:left-2 sm:bottom-2 sm:w-full',
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
	},
)

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
