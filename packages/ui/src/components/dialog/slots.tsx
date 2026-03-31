import {
	createPanelSlots,
	type PanelActionsProps,
	type PanelBodyProps,
	type PanelDescriptionProps,
	type PanelTitleProps,
} from '../../primitives'

const { Title, Description, Body, Actions } = createPanelSlots('dialog')

export type DialogTitleProps = PanelTitleProps
export type DialogDescriptionProps = PanelDescriptionProps
export type DialogBodyProps = PanelBodyProps
export type DialogActionsProps = PanelActionsProps

export {
	Actions as DialogActions,
	Body as DialogBody,
	Description as DialogDescription,
	Title as DialogTitle,
}
