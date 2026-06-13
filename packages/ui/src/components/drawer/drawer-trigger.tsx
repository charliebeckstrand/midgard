/**
 * Wraps a single child so clicking it opens the controlled {@link Drawer}; stamps the child
 * `aria-haspopup="dialog"` and, when `open` is supplied, `aria-expanded`. Aliases the shared
 * `PanelTrigger` primitive.
 */
export {
	PanelTrigger as DrawerTrigger,
	type PanelTriggerProps as DrawerTriggerProps,
} from '../../primitives/panel'
