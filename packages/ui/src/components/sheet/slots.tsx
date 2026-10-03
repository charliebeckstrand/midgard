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
import { k } from '../../recipes/kata/sheet'
import { Button } from '../button'

/** Props for {@link SheetTitle}: the heading `level` (default 2) plus the heading attributes. */
export type SheetTitleProps = PanelTitleProps
/** Props for {@link SheetDescription} (`<p>` attributes). */
export type SheetDescriptionProps = PanelDescriptionProps
/** Props for {@link SheetHeader} (`<div>` attributes). */
export type SheetHeaderProps = PanelHeaderProps
/** Props for {@link SheetBody} (`<div>` attributes). */
export type SheetBodyProps = PanelBodyProps
/** Props for {@link SheetFooter} (`<div>` attributes). */
export type SheetFooterProps = PanelFooterProps
/** Props for {@link SheetContent} (`<div>` attributes). */
export type SheetContentProps = PanelContentProps

/**
 * Sheet content slots, exported as `SheetTitle`, `SheetDescription`,
 * `SheetHeader`, `SheetBody`, `SheetFooter`, and `SheetContent`. `Title`/`Description` register
 * with the panel's a11y context to supply the dialog's accessible name and
 * description; `Header`/`Body`/`Footer` lay out the panel's regions.
 */
const { Title, Description, Header, Body, Footer, Content, DefaultFooter } = createPanel('sheet', {
	title: k.title,
	description: k.description,
	header: k.header,
	body: k.body,
	footer: k.footer,
})

/** Props for {@link SheetClose}: one clickable child, or none for the standard Close button. */
export type SheetCloseProps = Partial<PanelCloseProps>

/**
 * Closes the enclosing {@link Sheet}. With no child, it renders the standard
 * Close button, which is also the default footer of the sheet. With one child,
 * a click on the child closes the sheet, and the child's own `onClick` runs
 * first.
 */
export function SheetClose({ children }: SheetCloseProps) {
	return (
		<PanelClose>
			{children ?? (
				<Button type="button" variant="plain" data-slot="sheet-close">
					Close
				</Button>
			)}
		</PanelClose>
	)
}

export {
	/** `<div>` scroll region for the sheet's main content; fills remaining height and scrolls on overflow. */
	Body as SheetBody,
	/** `<div>` wrapper for arbitrary sheet content outside the header/body/footer rhythm. */
	Content as SheetContent,
	/**
	 * The footer that {@link Sheet} renders after its children while no `SheetFooter` is
	 * mounted. Its child is the content of the row.
	 *
	 * @internal
	 */
	DefaultFooter as SheetDefaultFooter,
	/** `<p>` supporting copy; registers as the sheet's `aria-describedby` target. */
	Description as SheetDescription,
	/**
	 * `<div>` action row pinned to the sheet's foot. It replaces the default footer of
	 * the sheet, which holds the standard Close button.
	 */
	Footer as SheetFooter,
	/** `<div>` grouping the sheet's title and description. */
	Header as SheetHeader,
	/**
	 * Wraps a single child so clicking it opens the controlled {@link Sheet}; stamps the child
	 * `aria-haspopup="dialog"` and, when `open` is supplied, `aria-expanded`. Aliases the shared
	 * `PanelTrigger` primitive.
	 */
	PanelTrigger as SheetTrigger,
	type PanelTriggerProps as SheetTriggerProps,
	/** `h{level}` heading, `<h2>` by default; registers as the sheet's `aria-labelledby` target with density-scaled type. */
	Title as SheetTitle,
}
