/**
 * Resolved size constraints for one panel, in percentages of the group, read
 * from {@link ResizablePanel} props.
 *
 * @internal
 */
export type PanelConfig = {
	/** The panel element's React key, as `Children.toArray` gives it. It names the panel in the set. */
	key: string
	defaultSize: number
	minSize: number
	maxSize: number
}
