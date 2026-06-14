/**
 * Wraps a single child so clicking it dismisses the enclosing {@link Sheet}; the child's own
 * `onClick` runs first, then the sheet closes. Aliases the shared `PanelClose` primitive.
 */
export {
	PanelClose as SheetClose,
	type PanelCloseProps as SheetCloseProps,
} from '../../primitives/panel'
