import { describe, expect, it } from 'vitest'
import { clampSizingToFloors } from '../../modules/grid/grid-table-options'

describe('clampSizingToFloors', () => {
	it('raises a width below its floor up to the floor', () => {
		// A single-word header floors at 90; a drag to 30 is caught and held at 90.
		expect(clampSizingToFloors({ name: 30 }, new Map([['name', 90]]))).toEqual({ name: 90 })
	})

	it('leaves a width at or above its floor untouched', () => {
		const floors = new Map([['name', 90]])

		expect(clampSizingToFloors({ name: 90 }, floors)).toEqual({ name: 90 })

		expect(clampSizingToFloors({ name: 200 }, floors)).toEqual({ name: 200 })
	})

	it('leaves a column with no measured floor to the engine minimum', () => {
		// `age` has no entry — it isn't clamped here; the engine's own `minSize` still
		// applies through `getSize`.
		expect(clampSizingToFloors({ age: 10 }, new Map([['name', 90]]))).toEqual({ age: 10 })
	})

	it('clamps only the columns below their floor and passes the rest through', () => {
		const sizing = { name: 30, age: 120, city: 50 }

		const floors = new Map([
			['name', 90],
			['age', 80],
			['city', 70],
		])

		expect(clampSizingToFloors(sizing, floors)).toEqual({ name: 90, age: 120, city: 70 })
	})

	it('returns the input object unchanged when nothing sits below its floor', () => {
		// Reference identity matters: the autosizer returns its prior sizing object on a
		// no-op tick, and clamping must not allocate a fresh one and re-render the grid.
		const sizing = { name: 120, age: 80 }

		expect(clampSizingToFloors(sizing, new Map([['name', 90]]))).toBe(sizing)
	})

	it('does not mutate the input when a clamp is applied', () => {
		const sizing = { name: 30 }

		const result = clampSizingToFloors(sizing, new Map([['name', 90]]))

		expect(result).not.toBe(sizing)

		expect(sizing).toEqual({ name: 30 })
	})

	it('is a no-op for an empty sizing or empty floors', () => {
		expect(clampSizingToFloors({}, new Map([['name', 90]]))).toEqual({})

		const sizing = { name: 30 }

		expect(clampSizingToFloors(sizing, new Map())).toBe(sizing)
	})
})
