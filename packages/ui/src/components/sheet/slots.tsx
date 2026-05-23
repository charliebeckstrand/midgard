import {
	createPanel,
	type PanelBodyProps,
	type PanelDescriptionProps,
	type PanelFooterProps,
	type PanelHeaderProps,
	type PanelTitleProps,
} from '../../primitives/panel'
import { k } from '../../recipes/kata/sheet'

export type SheetTitleProps = PanelTitleProps
export type SheetDescriptionProps = PanelDescriptionProps
export type SheetHeaderProps = PanelHeaderProps
export type SheetBodyProps = PanelBodyProps
export type SheetFooterProps = PanelFooterProps

const { Title, Description, Header, Body, Footer } = createPanel('sheet', {
	title: k.title,
	description: k.description,
	header: k.header,
	body: k.body,
	footer: k.footer,
})

export {
	Body as SheetBody,
	Description as SheetDescription,
	Footer as SheetFooter,
	Header as SheetHeader,
	Title as SheetTitle,
}
