import {
	createPanel,
	type PanelBodyProps,
	type PanelDescriptionProps,
	type PanelFooterProps,
	type PanelHeaderProps,
	type PanelTitleProps,
} from '../../primitives/panel'
import { k } from '../../recipes/kata/sheet'

/** Props for {@link SheetTitle}. */
export type SheetTitleProps = PanelTitleProps
/** Props for {@link SheetDescription}. */
export type SheetDescriptionProps = PanelDescriptionProps
/** Props for {@link SheetHeader}. */
export type SheetHeaderProps = PanelHeaderProps
/** Props for {@link SheetBody}. */
export type SheetBodyProps = PanelBodyProps
/** Props for {@link SheetFooter}. */
export type SheetFooterProps = PanelFooterProps

/**
 * Sheet content slots, exported as `SheetTitle`, `SheetDescription`,
 * `SheetHeader`, `SheetBody`, and `SheetFooter`. `Title`/`Description` register
 * with the panel's a11y context to supply the dialog's accessible name and
 * description; `Header`/`Body`/`Footer` lay out the panel's regions.
 */
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
