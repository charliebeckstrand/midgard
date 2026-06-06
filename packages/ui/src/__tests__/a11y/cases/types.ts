import type { UserEvent } from '@testing-library/user-event'
import type { ReactElement } from 'react'

/** A named, canonical render the baseline gate asserts is axe-clean. */
export type Case = readonly [name: string, element: ReactElement]

/**
 * A case whose overlay has no controlled-open prop: `open` drives it open
 * through a real interaction before the gate asserts against the document.
 */
export type InteractiveCase = readonly [
	name: string,
	element: ReactElement,
	open: (user: UserEvent) => Promise<void>,
]
