import type { ReactElement } from 'react'
import { describe, expectTypeOf, it } from 'vitest'
import { CheckboxGroup } from '../../components/checkbox'

describe('CheckboxGroup', () => {
	it('requires an accessible name', () => {
		// The group is `role="group"`, so a group with no `aria-label` and no
		// `aria-labelledby` must not typecheck.
		expectTypeOf(
			<>
				{/* @ts-expect-error: a checkbox group needs aria-label or aria-labelledby */}
				<CheckboxGroup>items</CheckboxGroup>

				<CheckboxGroup aria-labelledby="notifications-heading">items</CheckboxGroup>
			</>,
		).toExtend<ReactElement>()
	})
})
