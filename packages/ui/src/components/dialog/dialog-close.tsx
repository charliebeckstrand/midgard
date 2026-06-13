/**
 * Wraps a single child so clicking it dismisses the enclosing {@link Dialog}; the child's own
 * `onClick` runs first, then the dialog closes. Aliases the shared `PanelClose` primitive.
 */
export {
	PanelClose as DialogClose,
	type PanelCloseProps as DialogCloseProps,
} from '../../primitives/panel'
