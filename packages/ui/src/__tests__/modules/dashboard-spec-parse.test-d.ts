import { describe, expectTypeOf, it } from 'vitest'
import type { DashboardSpecParseOptions } from '../../modules/dashboard/engine/dashboard-spec-parse'

describe('DashboardSpecParseOptions types', () => {
	it('refuses a bare string as the ids of the JSX tiles', () => {
		// A bare string is iterable, and a loop over it yields letters, so the type refuses it.
		expectTypeOf<string>().not.toExtend<NonNullable<DashboardSpecParseOptions['tileIds']>>()
	})
})
