import { cva, type VariantProps } from 'class-variance-authority'
import {
	panelActionsVariants,
	panelDescriptionVariants,
	panelTitleVariants,
} from '../../primitives/panel-slots'
import { ki, narabi, omote, sumi, take } from '../../recipes'

export const sheetPanelVariants = cva(
	[
		omote.panel,
		'fixed flex flex-col overflow-y-auto rounded-xl',
		'max-sm:inset-x-0 max-sm:bottom-0 max-sm:w-full max-sm:max-h-[calc(75dvh)] max-sm:rounded-b-none',
	],
	{
		variants: {
			side: {
				right: 'sm:top-4 sm:right-4 sm:bottom-4 sm:w-full',
				left: 'sm:top-4 sm:left-4 sm:bottom-4 sm:w-full',
				top: narabi.slide.top,
				bottom: narabi.slide.bottom,
			},
			size: take.panel,
		},
		defaultVariants: {
			side: 'right',
			size: 'md',
		},
	},
)

export const sheetTitleVariants = cva([panelTitleVariants(), 'px-6 pt-6'])

export const sheetDescriptionVariants = cva([panelDescriptionVariants(), 'px-6'])

export const sheetActionsVariants = cva([panelActionsVariants(), 'px-6 pb-6'])

/** SheetBody extends panelBody with scroll support */
export const sheetBodyVariants = cva('mt-4 flex-1 overflow-y-auto px-6')

export const sheetCloseVariants = cva([
	sumi.muted,
	ki.offset,
	'absolute right-4 top-4 rounded-md p-1',
	'hover:text-zinc-500 dark:hover:text-zinc-400',
])

export type SheetPanelVariants = VariantProps<typeof sheetPanelVariants>
