import { describe, expectTypeOf, it } from 'vitest'
import type { ListProps } from '../../components/list'

type Item = { id: string; label: string }

describe('List', () => {
	it('keeps the three reorder arms of ListProps (compile-time)', () => {
		// The arms share one declaration of `getKey` and `onReorder`, so the API
		// prints each type one time. This pins the accepted set to the arms as
		// they were before that change.
		type Arms<P> = P extends unknown ? Pick<P, keyof ReorderArm & keyof P> : never

		type ReorderArm = {
			sortable?: boolean
			getKey?: (item: Item) => string
			onReorder?: (next: Item[]) => void
			virtual?: boolean
		}

		type Before =
			| {
					sortable?: true
					getKey: (item: Item) => string
					onReorder?: (next: Item[]) => void
					virtual?: false
			  }
			| {
					sortable: false
					getKey: (item: Item) => string
					onReorder: (next: Item[]) => void
					virtual?: false
			  }
			| {
					sortable: false
					getKey?: (item: Item) => string
					onReorder?: undefined
					virtual?: boolean
			  }

		expectTypeOf<Arms<ListProps<Item>>>().toEqualTypeOf<Before>()
	})

	it('requires getKey for reorderable configurations (compile-time)', () => {
		// The index-key fallback gives positional keys, and a reorder changes them.
		// Each item then mounts again during a drag. Thus `onReorder` without
		// `getKey` must not typecheck.
		// @ts-expect-error: onReorder requires getKey
		const props: ListProps<Item> = {
			items: [],
			sortable: false,
			onReorder: () => {},
			children: () => null,
		}

		expectTypeOf(props).toExtend<ListProps<Item>>()
	})
})
