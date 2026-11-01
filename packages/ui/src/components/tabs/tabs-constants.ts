import type { ScrollWithinOptions } from '../../hooks/use-scroll-within'
import type { TabsOrientation } from './context'

export const TAB_SELECTOR = 'button[data-slot="tab"]:not(:disabled)'

/** Matches the scroll viewport that wraps an underline tab list. */
export const TAB_LIST_SCROLL_SELECTOR = '[data-slot="tab-list-scroll"]'

/** The least move on the flow axis of the list. The cross axis keeps its position. */
export const FLOW_SCROLL: Record<TabsOrientation, ScrollWithinOptions> = {
	horizontal: { inline: 'nearest' },
	vertical: { block: 'nearest' },
}
