import { takeLinkSecrets } from 'shared/link-secrets'
import { moveDoubleClickToRoot } from 'ui/core'
import { startEvents } from 'ui/events'

// The App Router hydrates the document, so the `dblclick` listeners of React
// go on the root element. The root style then stops iOS from joining two quick
// taps into one double-click.
moveDoubleClickToRoot()

// The client instrumentation of Next.js runs before the page hydrates. Thus the
// secret of an emailed link leaves the address before the App Router reads it,
// and the events record from the start of the page while the Debug switch is on.
takeLinkSecrets()

void startEvents()

export { onRouterTransitionStart } from 'shared/events'
