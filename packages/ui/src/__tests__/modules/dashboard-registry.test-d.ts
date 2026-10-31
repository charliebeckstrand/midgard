import type { ReactNode } from 'react'
import { describe, expectTypeOf, it } from 'vitest'
import type { DashboardWidgetRenderer } from '../../modules/dashboard'

describe('DashboardWidgetRenderer types', () => {
	it('types a renderer that returns a promise as an error', () => {
		// The renderer runs again on each Suspense retry, so a promise never settles.
		expectTypeOf<() => Promise<ReactNode>>().not.toExtend<DashboardWidgetRenderer>()
	})
})
