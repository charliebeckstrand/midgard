/**
 * Wraps a single child so clicking it dismisses the enclosing {@link Drawer}; the child's own
 * `onClick` runs first, then the drawer closes. Aliases the shared `PanelClose` primitive.
 */
export {
	PanelClose as DrawerClose,
	type PanelCloseProps as DrawerCloseProps,
} from '../../primitives/panel'
