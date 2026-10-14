import { InlineScript } from '../../primitives/inline-script/inline-script'
import { SCRIPT } from './engine/events-setting'

/**
 * The pre-paint script of the events. Render it in the `<head>`, before the
 * first paint. It copies the settings of the events to attributes of the root
 * element, so CSS shows the header button and the pinned panel in the first
 * paint, with no shift when the page hydrates.
 */
export function EventsScript() {
	return <InlineScript source={SCRIPT} />
}
