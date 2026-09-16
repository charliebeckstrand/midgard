import {
	createPanel,
	type PanelBodyProps,
	type PanelContentProps,
	type PanelDescriptionProps,
	type PanelFooterProps,
	type PanelHeaderProps,
	type PanelTitleProps,
} from '../../primitives/panel'
import { k } from '../../recipes/kata/drawer'

/** Props for {@link DrawerTitle} (`<h2>` attributes). */
export type DrawerTitleProps = PanelTitleProps
/** Props for {@link DrawerDescription} (`<p>` attributes). */
export type DrawerDescriptionProps = PanelDescriptionProps
/** Props for {@link DrawerHeader} (`<div>` attributes). */
export type DrawerHeaderProps = PanelHeaderProps
/** Props for {@link DrawerBody} (`<div>` attributes). */
export type DrawerBodyProps = PanelBodyProps
/** Props for {@link DrawerFooter} (`<div>` attributes). */
export type DrawerFooterProps = PanelFooterProps
/** Props for {@link DrawerContent} (`<div>` attributes). */
export type DrawerContentProps = PanelContentProps

const { Title, Description, Header, Body, Footer, Content } = createPanel('drawer', {
	title: k.title,
	description: k.description,
	header: k.header,
	body: k.body,
	footer: k.footer,
})

export {
	/** `<div>` scroll region for the drawer's main content; fills remaining height and scrolls on overflow. */
	Body as DrawerBody,
	/** `<div>` wrapper for arbitrary drawer content outside the header/body/footer rhythm. */
	Content as DrawerContent,
	/** `<p>` supporting copy; registers as the drawer's `aria-describedby` target. */
	Description as DrawerDescription,
	/** `<div>` action row pinned to the drawer's foot. */
	Footer as DrawerFooter,
	/** `<div>` grouping the drawer's title and description. */
	Header as DrawerHeader,
	/** `<h2>` heading; registers as the drawer's `aria-labelledby` target with density-scaled type. */
	Title as DrawerTitle,
}
