import {
	createPanel,
	type PanelBodyProps,
	type PanelDescriptionProps,
	type PanelFooterProps,
	type PanelHeaderProps,
	type PanelTitleProps,
} from '../../primitives/panel'
import { k } from '../../recipes/kata/drawer'

export type DrawerTitleProps = PanelTitleProps
export type DrawerDescriptionProps = PanelDescriptionProps
export type DrawerHeaderProps = PanelHeaderProps
export type DrawerBodyProps = PanelBodyProps
export type DrawerFooterProps = PanelFooterProps

const { Title, Description, Header, Body, Footer } = createPanel('drawer', {
	title: k.title,
	description: k.description,
	header: k.header,
	body: k.body,
	footer: k.footer,
})

export {
	Body as DrawerBody,
	Description as DrawerDescription,
	Footer as DrawerFooter,
	Header as DrawerHeader,
	Title as DrawerTitle,
}
