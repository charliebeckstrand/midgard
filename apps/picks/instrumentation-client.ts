import { takeLinkSecrets } from 'shared/link-secrets'
import { startEvents } from 'ui/events'

// The client instrumentation of Next.js runs before the page hydrates. Thus the
// secret of an emailed link leaves the address before the App Router reads it,
// and the events record from the start of the page while the Debug switch is on.
takeLinkSecrets()

void startEvents()

export { onRouterTransitionStart } from 'shared/events'
