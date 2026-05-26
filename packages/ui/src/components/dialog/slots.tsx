import {
	createPanel,
	type PanelBodyProps,
	type PanelContentProps,
	type PanelDescriptionProps,
	type PanelFooterProps,
	type PanelHeaderProps,
	type PanelTitleProps,
} from '../../primitives/panel'

const { Title, Description, Header, Body, Footer, Content } = createPanel('dialog')

export type DialogTitleProps = PanelTitleProps
export type DialogDescriptionProps = PanelDescriptionProps
export type DialogHeaderProps = PanelHeaderProps
export type DialogBodyProps = PanelBodyProps
export type DialogFooterProps = PanelFooterProps
export type DialogContentProps = PanelContentProps

export {
	Body as DialogBody,
	Content as DialogContent,
	Description as DialogDescription,
	Footer as DialogFooter,
	Header as DialogHeader,
	Title as DialogTitle,
}
