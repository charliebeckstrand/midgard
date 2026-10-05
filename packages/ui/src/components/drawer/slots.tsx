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
import { Button } from '../button'

/** Props for {@link DrawerTitle}: the heading `level` (default 2) plus the heading attributes. */
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

const { Title, Description, Header, Body, Footer, Content, DefaultFooter } = createPanel('drawer', {
	title: k.title,
	description: k.description,
	header: k.header,
	body: k.body,
	footer: k.footer,
})

/** Props for {@link DrawerClose}: one clickable child, or none for the standard Close button. */
export type DrawerCloseProps = Partial<PanelCloseProps>

/**
 * Closes the enclosing {@link Drawer}. With no child, it renders the standard
 * Close button, which is also the default footer of the drawer. With one child,
 * a click on the child closes the drawer, and the child's own `onClick` runs
 * first.
 */
export function DrawerClose({ children }: DrawerCloseProps) {
	return (
		<PanelClose>
			{children ?? (
				<Button type="button" variant="soft" data-slot="drawer-close">
					Close
				</Button>
			)}
		</PanelClose>
	)
}

export {
	/** `<div>` scroll region for the drawer's main content; fills remaining height and scrolls on overflow. */
	Body as DrawerBody,
	/** `<div>` wrapper for arbitrary drawer content outside the header/body/footer rhythm. */
	Content as DrawerContent,
	/**
	 * The footer that {@link Drawer} renders after its children while no `DrawerFooter` is
	 * mounted. Its child is the content of the row.
	 *
	 * @internal
	 */
	DefaultFooter as DrawerDefaultFooter,
	/** `<p>` supporting copy; registers as the drawer's `aria-describedby` target. */
	Description as DrawerDescription,
	/**
	 * `<div>` action row pinned to the drawer's foot. It replaces the default footer of
	 * the drawer, which holds the standard Close button.
	 */
	Footer as DrawerFooter,
	/** `<div>` grouping the drawer's title and description. */
	Header as DrawerHeader,
	/**
	 * Opens the panel of the enclosing {@link Drawer}. A single element child is cloned, and a
	 * click on it opens the panel. The trigger stamps `aria-haspopup="dialog"`, `aria-expanded`,
	 * and, while the panel is open, `aria-controls`. It must be inside the `<Drawer>` root.
	 * Aliases the shared `PanelTrigger` primitive.
	 */
	PanelTrigger as DrawerTrigger,
	type PanelTriggerProps as DrawerTriggerProps,
	/** `h{level}` heading, `<h2>` by default; registers as the drawer's `aria-labelledby` target with density-scaled type. */
	Title as DrawerTitle,
}
