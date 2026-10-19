import { describe, expectTypeOf, it } from 'vitest'
import type { TabsProps } from '../../components/tabs'

describe('Tabs selection value types', () => {
	it('types defaultValue as a plain string', () => {
		expectTypeOf<TabsProps['defaultValue']>().toEqualTypeOf<string | undefined>()
	})
})
