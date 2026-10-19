import { describe, expectTypeOf, it } from 'vitest'
import type { NavMenuItemProps, NavProps } from '../../components/nav'

describe('Nav and NavItem selection value types', () => {
	it('types Nav defaultValue and NavItem value as a plain string', () => {
		expectTypeOf<NavProps['defaultValue']>().toEqualTypeOf<string | undefined>()

		expectTypeOf<NavMenuItemProps['value']>().toEqualTypeOf<string | undefined>()
	})
})
