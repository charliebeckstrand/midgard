import {
	createPanel,
	type PanelActionsProps,
	type PanelBodyProps,
	type PanelContentProps,
	type PanelDescriptionProps,
	type PanelHeaderProps,
	type PanelTitleProps,
} from '../../primitives/panel'

const { Title, Description, Header, Body, Actions, Content } = createPanel('dialog')

export type DialogTitleProps = PanelTitleProps
export type DialogDescriptionProps = PanelDescriptionProps
export type DialogHeaderProps = PanelHeaderProps
export type DialogBodyProps = PanelBodyProps
export type DialogActionsProps = PanelActionsProps
export type DialogContentProps = PanelContentProps

export {
	Actions as DialogActions,
	Body as DialogBody,
	Content as DialogContent,
	Description as DialogDescription,
	Header as DialogHeader,
	Title as DialogTitle,
}
