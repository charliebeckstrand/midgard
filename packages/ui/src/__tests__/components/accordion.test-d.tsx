import type { ReactElement } from 'react'
import { describe, expectTypeOf, it } from 'vitest'
import { Accordion } from '../../components/accordion'

describe('Accordion', () => {
	it('requires an open section for collapsible={false}', () => {
		// A held accordion cannot close to none, so it must start with a section open.
		expectTypeOf(
			<>
				{/* @ts-expect-error: collapsible={false} needs a value or a defaultValue */}
				<Accordion collapsible={false}>items</Accordion>

				{/* @ts-expect-error: a held accordion cannot hold no section */}
				<Accordion collapsible={false} value={null}>
					items
				</Accordion>

				<Accordion collapsible={false} defaultValue="a">
					items
				</Accordion>

				<Accordion collapsible={false} value="a" onValueChange={(value: string) => value}>
					items
				</Accordion>
			</>,
		).toExtend<ReactElement>()
	})
})
