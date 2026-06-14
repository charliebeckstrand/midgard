import {
	createPanel,
	type PanelBodyProps,
	type PanelDescriptionProps,
	type PanelFooterProps,
	type PanelHeaderProps,
	type PanelTitleProps,
} from '../../primitives/panel'
import { k } from '../../recipes/kata/sheet'

/** Props for {@link SheetTitle} (`<h2>` attributes). */
export type SheetTitleProps = PanelTitleProps
/** Props for {@link SheetDescription} (`<p>` attributes). */
export type SheetDescriptionProps = PanelDescriptionProps
/** Props for {@link SheetHeader} (`<div>` attributes). */
export type SheetHeaderProps = PanelHeaderProps
/** Props for {@link SheetBody} (`<div>` attributes). */
export type SheetBodyProps = PanelBodyProps
/** Props for {@link SheetFooter} (`<div>` attributes). */
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
	/** `<div>` scroll region for the sheet's main content; fills remaining height and scrolls on overflow. */
	Body as SheetBody,
	/** `<p>` supporting copy; registers as the sheet's `aria-describedby` target. */
	Description as SheetDescription,
	/** `<div>` action row pinned to the sheet's foot. */
	Footer as SheetFooter,
	/** `<div>` grouping the sheet's title and description. */
	Header as SheetHeader,
	/** `<h2>` heading; registers as the sheet's `aria-labelledby` target with density-scaled type. */
	Title as SheetTitle,
}
