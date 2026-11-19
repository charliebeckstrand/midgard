import { takeLinkSecrets } from 'shared/link-secrets'

// The client instrumentation of Next.js runs before the page hydrates. Thus the
// secret of an emailed link leaves the address before the App Router reads it.
takeLinkSecrets()
