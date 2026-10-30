import { describe, expectTypeOf, it } from 'vitest'
import type { ContextMenuEntry, ContextMenuProps } from '../../components/context-menu'

describe('ContextMenu entry types', () => {
	it('takes separators and submenus in its defaults and its custom items', () => {
		expectTypeOf<ContextMenuProps['defaults']>().toEqualTypeOf<ContextMenuEntry[] | undefined>()

		expectTypeOf<ContextMenuProps['items']>().toEqualTypeOf<ContextMenuEntry[] | undefined>()
	})
})
