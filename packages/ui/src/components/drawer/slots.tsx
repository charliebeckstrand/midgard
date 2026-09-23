import {
	createPanel,
	type PanelBodyProps,
	PanelClose,
	type PanelCloseProps,
	type PanelContentProps,
	type PanelDescriptionProps,
	type PanelFooterProps,
	type PanelHeaderProps,
	type PanelTitleProps,
	PanelTrigger,
	type PanelTriggerProps,
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
	/**
	 * Wraps a single child so clicking it dismisses the enclosing {@link Drawer}; the child's own
	 * `onClick` runs first, then the drawer closes. Aliases the shared `PanelClose` primitive.
	 */
	PanelClose as DrawerClose,
	type PanelCloseProps as DrawerCloseProps,
	/**
	 * Wraps a single child so clicking it opens the controlled {@link Drawer}; stamps the child
	 * `aria-haspopup="dialog"` and, when `open` is supplied, `aria-expanded`. Aliases the shared
	 * `PanelTrigger` primitive.
	 */
	PanelTrigger as DrawerTrigger,
	type PanelTriggerProps as DrawerTriggerProps,
	/** `<h2>` heading; registers as the drawer's `aria-labelledby` target with density-scaled type. */
	Title as DrawerTitle,
}
