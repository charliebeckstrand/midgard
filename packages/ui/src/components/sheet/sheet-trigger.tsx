/**
 * Wraps a single child so clicking it opens the controlled {@link Sheet}; stamps the child
 * `aria-haspopup="dialog"` and, when `open` is supplied, `aria-expanded`. Aliases the shared
 * `PanelTrigger` primitive.
 */
export {
	PanelTrigger as SheetTrigger,
	type PanelTriggerProps as SheetTriggerProps,
} from '../../primitives/panel'
