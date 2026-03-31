import { cva, type VariantProps } from 'class-variance-authority'
import {
	panelActionsVariants as dialogActionsVariants,
	panelBodyVariants as dialogBodyVariants,
	panelDescriptionVariants as dialogDescriptionVariants,
	panelTitleVariants as dialogTitleVariants,
} from '../../primitives/panel-slots'
import { katachi, omote } from '../../recipes'

export const dialogPanelVariants = cva([omote.panel, 'relative w-full rounded-2xl p-6'], {
	variants: {
		size: katachi.panel,
	},
	defaultVariants: {
		size: 'lg',
	},
})

export { dialogActionsVariants, dialogBodyVariants, dialogDescriptionVariants, dialogTitleVariants }

export type DialogPanelVariants = VariantProps<typeof dialogPanelVariants>
