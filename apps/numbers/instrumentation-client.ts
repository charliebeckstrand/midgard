import { startEvents } from 'ui/events'

// The client instrumentation of Next.js runs before the page hydrates, so the
// events record from the start of the page while the Debug switch is on.
void startEvents()

export { onRouterTransitionStart } from 'shared/events'
