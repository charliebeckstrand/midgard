import type { ComponentProps, RefObject } from 'react'
import type { HeadingLevel } from '../../recipes/kata/heading'

/** Props for a panel `Title` slot (`<h2>` by default): the heading `level` plus the native heading attributes. */
export type PanelTitleProps = ComponentProps<'h2'> & {
	/**
	 * Heading level of the rendered title. Level 2 fits a modal panel, which is
	 * the top of its own outline. Set it for a non-modal panel, which is a part of
	 * the outline of the page. The font weight follows the level.
	 * @defaultValue 2
	 */
	level?: HeadingLevel
}
/** Props for a panel `Description` slot (`<p>`). */
export type PanelDescriptionProps = ComponentProps<'p'>
/** Props for a panel `Header` slot (`<div>`). */
export type PanelHeaderProps = ComponentProps<'div'>
/** Props for a panel `Body` slot (`<div>`); scroll region. */
export type PanelBodyProps = ComponentProps<'div'>
/** Props for a panel `Footer` slot (`<div>`). */
export type PanelFooterProps = ComponentProps<'div'>
/** Props for a panel `Content` slot (`<div>`). */
export type PanelContentProps = ComponentProps<'div'>

/**
 * The `<Overlay>` knobs every modal panel root forwards. Dialog, Sheet, and
 * Drawer each intersect this type. One capability therefore has one name and
 * one default across the family.
 *
 * @see {@link Overlay} for what each one drives.
 */
export type PanelOverlayProps = {
	/**
	 * Lets a press on the backdrop close the panel.
	 * @defaultValue true
	 */
	dismissOnBackdrop?: boolean
	/**
	 * Makes the panel modal (the default). A modal panel traps focus, moves it
	 * into the panel on open, locks body scroll, and dims the page behind a
	 * blocking backdrop. Pass `false` for a transient, pointer-driven surface
	 * that leaves focus and the page alone. A hover-revealed peek is the example.
	 * Escape or a press outside still closes it.
	 * @defaultValue true
	 */
	modal?: boolean
	/**
	 * Paints the dimming backdrop independently of modality. A non-modal panel
	 * renders none by default; opt in to blur and dim the page behind it. The
	 * scrim stays non-interactive, so the page stays usable. A modal panel with
	 * no backdrop still closes on a press outside it, unless `dismissOnBackdrop`
	 * is `false`.
	 * @defaultValue `true`, or `false` when `modal` is `false`.
	 */
	backdrop?: boolean
	/**
	 * Element to portal into. The panel is then scoped to that element
	 * (`absolute` positioning, no body scroll lock), which has to establish a
	 * positioning context. The panel stays in the box of that element: the
	 * overlay clips it, also during the slide, so the focus that moves into it
	 * does not scroll that element.
	 * @defaultValue `document.body`, with full-viewport `fixed` positioning.
	 */
	container?: HTMLElement | null
	/**
	 * The element that gets the focus when the panel opens.
	 * @defaultValue the first tabbable element in the panel.
	 */
	initialFocus?: RefObject<HTMLElement | null>
	/**
	 * The element that gets the focus when the panel closes. Give it when the
	 * element that had the focus as the panel opened can be gone at the close,
	 * or when the focus belongs elsewhere.
	 * @defaultValue the element that had the focus as the panel opened.
	 */
	returnFocusTo?: RefObject<HTMLElement | null>
}
