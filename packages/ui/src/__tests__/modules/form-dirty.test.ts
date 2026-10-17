// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { dirtyFields } from '../../modules/form/engine/form-dirty'

describe('dirtyFields', () => {
	it('flags each field whose value differs from its default', () => {
		expect(dirtyFields({ name: 'Jane', age: 30 }, { name: '', age: 30 })).toEqual({
			name: true,
			age: false,
		})
	})

	it('compares structured values by content', () => {
		const flags = dirtyFields(
			{ tags: ['a', 'b'], when: new Date(0), meta: { x: 1 } },
			{ tags: ['a', 'b'], when: new Date(0), meta: { x: 1 } },
		)

		expect(flags).toEqual({ tags: false, when: false, meta: false })
	})

	it('gives no flag for a key that only the defaults hold', () => {
		expect(dirtyFields({ name: '' }, { name: '', extra: 1 })).toEqual({ name: false })
	})
})
