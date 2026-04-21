import { dialog } from '../../recipes/katachi/dialog'

export type { DialogPanelVariants } from '../../recipes/katachi/dialog'

export const dialogPanelVariants = dialog.panel

export {
	panelActions as dialogActionsVariants,
	panelBody as dialogBodyVariants,
	panelDescription as dialogDescriptionVariants,
	panelTitle as dialogTitleVariants,
} from '../../recipes/katachi/panel'
