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

const { Title, Description, Header, Body, Footer, Content } = createPanel('dialog')

/** Props for {@link DialogTitle} (`<h2>` attributes). */
export type DialogTitleProps = PanelTitleProps
/** Props for {@link DialogDescription} (`<p>` attributes). */
export type DialogDescriptionProps = PanelDescriptionProps
/** Props for {@link DialogHeader} (`<div>` attributes). */
export type DialogHeaderProps = PanelHeaderProps
/** Props for {@link DialogBody} (`<div>` attributes). */
export type DialogBodyProps = PanelBodyProps
/** Props for {@link DialogFooter} (`<div>` attributes). */
export type DialogFooterProps = PanelFooterProps
/** Props for {@link DialogContent} (`<div>` attributes). */
export type DialogContentProps = PanelContentProps

export {
	/** `<div>` scroll region for the dialog's main content; marked as a scroll region for overflow handling. */
	Body as DialogBody,
	/** `<div>` wrapper for arbitrary dialog content outside the header/body/footer rhythm. */
	Content as DialogContent,
	/** `<p>` supporting copy; registers as the dialog's `aria-describedby` target. */
	Description as DialogDescription,
	/** `<div>` action row pinned to the dialog's foot. */
	Footer as DialogFooter,
	/** `<div>` grouping the dialog's title and description. */
	Header as DialogHeader,
	/**
	 * Wraps a single child so clicking it dismisses the enclosing {@link Dialog}; the child's own
	 * `onClick` runs first, then the dialog closes. Aliases the shared `PanelClose` primitive.
	 */
	PanelClose as DialogClose,
	type PanelCloseProps as DialogCloseProps,
	/**
	 * Wraps a single child so clicking it opens the controlled {@link Dialog}; stamps the child
	 * `aria-haspopup="dialog"` and, when `open` is supplied, `aria-expanded`. Aliases the shared
	 * `PanelTrigger` primitive.
	 */
	PanelTrigger as DialogTrigger,
	type PanelTriggerProps as DialogTriggerProps,
	/** `<h2>` heading; registers as the dialog's `aria-labelledby` target with density-scaled type. */
	Title as DialogTitle,
}
