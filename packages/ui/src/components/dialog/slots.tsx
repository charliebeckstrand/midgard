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
import { Button } from '../button'

const { Title, Description, Header, Body, Footer, Content, DefaultFooter } = createPanel('dialog')

/** Props for {@link DialogTitle}: the heading `level` (default 2) plus the heading attributes. */
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

/** Props for {@link DialogClose}: one clickable child, or none for the standard Close button. */
export type DialogCloseProps = Partial<PanelCloseProps>

/**
 * Closes the enclosing {@link Dialog}. With no child, it renders the standard
 * Close button, which is also the default footer of the dialog. With one child,
 * a click on the child closes the dialog, and the child's own `onClick` runs
 * first.
 */
export function DialogClose({ children }: DialogCloseProps) {
	return (
		<PanelClose>
			{children ?? (
				<Button type="button" variant="plain" data-slot="dialog-close">
					Close
				</Button>
			)}
		</PanelClose>
	)
}

export {
	/** `<div>` scroll region for the dialog's main content; marked as a scroll region for overflow handling. */
	Body as DialogBody,
	/** `<div>` wrapper for arbitrary dialog content outside the header/body/footer rhythm. */
	Content as DialogContent,
	/**
	 * The footer that {@link Dialog} renders after its children while no `DialogFooter` is
	 * mounted. Its child is the content of the row.
	 *
	 * @internal
	 */
	DefaultFooter as DialogDefaultFooter,
	/** `<p>` supporting copy; registers as the dialog's `aria-describedby` target. */
	Description as DialogDescription,
	/**
	 * `<div>` action row pinned to the dialog's foot. It replaces the default footer of
	 * the dialog, which holds the standard Close button.
	 */
	Footer as DialogFooter,
	/** `<div>` grouping the dialog's title and description. */
	Header as DialogHeader,
	/**
	 * Opens the panel of the enclosing {@link Dialog}. A single element child is cloned, and a
	 * click on it opens the panel. The trigger stamps `aria-haspopup="dialog"`, `aria-expanded`,
	 * and, while the panel is open, `aria-controls`. It must be inside the `<Dialog>` root.
	 * Aliases the shared `PanelTrigger` primitive.
	 */
	PanelTrigger as DialogTrigger,
	type PanelTriggerProps as DialogTriggerProps,
	/** `h{level}` heading, `<h2>` by default; registers as the dialog's `aria-labelledby` target with density-scaled type. */
	Title as DialogTitle,
}
