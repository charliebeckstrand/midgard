import { cva, type VariantProps } from 'class-variance-authority'
import {
	panelActionsVariants as dialogActionsVariants,
	panelBodyVariants as dialogBodyVariants,
	panelDescriptionVariants as dialogDescriptionVariants,
	panelTitleVariants as dialogTitleVariants,
} from '../../primitives/panel-slots'
import { omote, take } from '../../recipes'

export const dialogPanelVariants = cva(
	[
		omote.panel,
		'relative w-full p-6',
		// Mobile: bottom sheet style
		'max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:max-h-[calc(85dvh)] max-sm:overflow-y-auto',
		// Desktop: centered dialog
		'sm:rounded-2xl',
	],
	{
		variants: {
			size: take.panel,
		},
		defaultVariants: {
			size: 'lg',
		},
	},
)

export { dialogActionsVariants, dialogBodyVariants, dialogDescriptionVariants, dialogTitleVariants }

export type DialogPanelVariants = VariantProps<typeof dialogPanelVariants>
