/**
 * Wraps a single child so clicking it opens the controlled {@link Dialog}; stamps the child
 * `aria-haspopup="dialog"` and, when `open` is supplied, `aria-expanded`. Aliases the shared
 * `PanelTrigger` primitive.
 */
export {
	PanelTrigger as DialogTrigger,
	type PanelTriggerProps as DialogTriggerProps,
} from '../../primitives/panel'
