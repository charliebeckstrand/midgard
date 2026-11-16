import { moveDoubleClickToRoot } from 'ui/core'
import { startEvents } from 'ui/events'

// The App Router hydrates the document, so the `dblclick` listeners of React
// go on the root element. The root style then stops iOS from joining two quick
// taps into one double-click.
moveDoubleClickToRoot()

// The client instrumentation of Next.js runs before the page hydrates, so the
// events record from the start of the page while the Debug switch is on.
void startEvents()

export { onRouterTransitionStart } from 'shared/events'
