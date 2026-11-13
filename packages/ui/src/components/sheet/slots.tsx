import {
	createPanel,
	type PanelCloseProps,
	PanelTrigger,
	type PanelTriggerProps,
} from '../../primitives/panel'
import type {
	PanelBodyProps,
	PanelContentProps,
	PanelDescriptionProps,
	PanelFooterProps,
	PanelTitleProps,
} from '../../primitives/panel/types'
import { k } from '../../recipes/kata/sheet'
import {
	type ClosableHeaderProps,
	createPanelClose,
	createPanelHeader,
} from '../button/button-close'

/** Props for {@link SheetTitle}: the heading `level` (default 2) plus the heading attributes. */
export type SheetTitleProps = PanelTitleProps
/** Props for {@link SheetDescription} (`<p>` attributes). */
export type SheetDescriptionProps = PanelDescriptionProps
/** Props for {@link SheetHeader}: `closable` plus the `<div>` attributes. */
export type SheetHeaderProps = ClosableHeaderProps
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
const slots = k()

const { Title, Description, Header, Body, Footer, Content, DefaultFooter } = createPanel('sheet', {
	title: slots.title,
	description: slots.description,
	header: slots.header,
	body: slots.body,
	footer: slots.footer,
})

/** Props for {@link SheetClose}: one clickable child, or none for the standard Close button. */
export type SheetCloseProps = Partial<PanelCloseProps>

const Close = createPanelClose('sheet')

const ClosableHeader = createPanelHeader('sheet', Header)

export {
	/**
	 * The body of a sheet, which scrolls when its content is tall. It is a `<div>`
	 * that fills the remaining height.
	 */
	Body as SheetBody,
	/**
	 * The header of a sheet: a `<div>` that holds the title and the description, or a
	 * row such as the title with a close button. It stands one slot gap from the top
	 * edge, and the sheet puts the same gap under it, at each density. A title or a
	 * description in it takes no inset of its own. A `closable` header puts an X
	 * close at the end of the line of the title.
	 */
	ClosableHeader as SheetHeader,
	/**
	 * A control that closes the enclosing {@link Sheet}. With no child, it renders
	 * the standard Close button, which is also the default footer of the sheet.
	 * The standard button stays live in a locked scope, such as a submitting form.
	 * With one child, a click on the child closes the sheet, and the child's own
	 * `onClick` runs first.
	 */
	Close as SheetClose,
	/** A wrapper for sheet content outside the header/body/footer rhythm; renders a `<div>`. */
	Content as SheetContent,
	/**
	 * The footer that {@link Sheet} renders after its children while no `SheetFooter` is
	 * mounted. Its child is the content of the row.
	 *
	 * @internal
	 */
	DefaultFooter as SheetDefaultFooter,
	/** The description of a sheet: a `<p>` that registers as the sheet's `aria-describedby` target. */
	Description as SheetDescription,
	/**
	 * The footer of a sheet: a `<div>` action row pinned to the sheet's foot. It replaces the
	 * default footer of the sheet, which holds the standard Close button.
	 */
	Footer as SheetFooter,
	/**
	 * A trigger that opens the panel of the enclosing {@link Sheet}. A single
	 * element child is cloned, and a click on it opens the panel. The trigger
	 * stamps `aria-haspopup="dialog"`, `aria-expanded`, and, while the panel is
	 * open, `aria-controls`. It stamps `data-open` while the panel is open, and
	 * `data-disabled` while it is disabled. It must be inside the `<Sheet>` root.
	 * Aliases the shared `PanelTrigger` primitive.
	 */
	PanelTrigger as SheetTrigger,
	type PanelTriggerProps as SheetTriggerProps,
	/**
	 * The title of a sheet: an `h{level}` heading, `<h2>` by default, that registers as the
	 * sheet's `aria-labelledby` target. Its type scales with density.
	 */
	Title as SheetTitle,
}
