import { describe, expectTypeOf, it } from 'vitest'
import type { ListProps } from '../../components/list'

type Item = { id: string; label: string }

describe('List', () => {
	it('keeps the two reorder arms of ListProps (compile-time)', () => {
		// The arms share one declaration of `getKey` and `onReorder`, so the API
		// prints each type one time. A list with `onReorder` needs `getKey` and can
		// drop the auto handle. A list without it can virtualize and needs no flag.
		type Arms<P> = P extends unknown ? Pick<P, keyof ReorderArm & keyof P> : never

		type ReorderArm = {
			handle?: boolean
			getKey?: (item: Item) => string
			onReorder?: (next: Item[]) => void
			virtualize?: boolean
		}

		type Expected =
			| {
					handle?: boolean
					getKey: (item: Item) => string
					onReorder?: (next: Item[]) => void
					virtualize?: false
			  }
			| {
					handle?: undefined
					getKey?: (item: Item) => string
					onReorder?: undefined
					virtualize?: boolean
			  }

		expectTypeOf<Arms<ListProps<Item>>>().toEqualTypeOf<Expected>()
	})

	it('needs no flag on a read-only virtualized list (compile-time)', () => {
		const props: ListProps<Item> = {
			items: [],
			virtualize: true,
			children: () => null,
		}

		expectTypeOf(props).toExtend<ListProps<Item>>()
	})

	it('refuses virtualize on a reorderable list (compile-time)', () => {
		// A drag needs every row that it can pass over, so a windowed list cannot reorder.
		// @ts-expect-error: virtualize is for a read-only list
		const props: ListProps<Item> = {
			items: [],
			getKey: (item) => item.id,
			onReorder: () => {},
			virtualize: true,
			children: () => null,
		}

		expectTypeOf(props).toExtend<ListProps<Item>>()
	})

	it('accepts a readonly items array (compile-time)', () => {
		// The list does not change `items`. So a caller with a readonly array
		// passes it as it is and does not copy it on each render.
		const items: readonly Item[] = []

		const props: ListProps<Item> = {
			items,
			getKey: (item) => item.id,
			onReorder: () => {},
			children: () => null,
		}

		expectTypeOf(props.items).toEqualTypeOf<readonly Item[]>()
	})

	it('requires getKey for reorderable configurations (compile-time)', () => {
		// The index-key fallback gives positional keys, and a reorder changes them.
		// Each item then mounts again during a drag. Thus `onReorder` without
		// `getKey` must not typecheck.
		// @ts-expect-error: onReorder requires getKey
		const props: ListProps<Item> = {
			items: [],
			handle: false,
			onReorder: () => {},
			children: () => null,
		}

		expectTypeOf(props).toExtend<ListProps<Item>>()
	})
})
