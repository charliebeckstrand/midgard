import { cva, type VariantProps } from 'class-variance-authority'
import {
	panelActionsVariants as sheetActionsVariants,
	panelDescriptionVariants as sheetDescriptionVariants,
	panelTitleVariants as sheetTitleVariants,
} from '../../primitives/panel-slots'
import { katachi, ki, narabi, omote, sumi } from '../../recipes'

export const sheetPanelVariants = cva(
	[
		omote.panel,
		'fixed flex flex-col overflow-y-auto rounded-xl',
		// Mobile: always bottom sheet, constrain height
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
			size: katachi.panel,
		},
		defaultVariants: {
			side: 'right',
			size: 'md',
		},
	},
)

export { sheetActionsVariants, sheetDescriptionVariants, sheetTitleVariants }

/** SheetBody extends panelBody with scroll support */
export const sheetBodyVariants = cva('mt-4 flex-1 overflow-y-auto')

export const sheetCloseVariants = cva([
	'absolute right-4 top-4 rounded-md p-1',
	sumi.usui,
	'hover:text-zinc-500 dark:hover:text-zinc-400',
	ki.offset,
])

export type SheetPanelVariants = VariantProps<typeof sheetPanelVariants>
