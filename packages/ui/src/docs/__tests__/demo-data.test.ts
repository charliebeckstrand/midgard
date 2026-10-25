// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { people, person, profiles } from '../data/people.ts'
import { createRandom } from '../data/random.ts'

// The demo data is the same in each language, in the prerender, and in the
// hydration, so a demo shows the same rows in each of them.

describe('createRandom', () => {
	it('gives the same values for the same seed', () => {
		const draw = (seed: number) => {
			const random = createRandom(seed)

			return Array.from({ length: 5 }, () => random.int(1, 100))
		}

		expect(draw(7)).toEqual(draw(7))

		expect(draw(7)).not.toEqual(draw(8))
	})

	it('keeps each whole number in its range', () => {
		const random = createRandom(1)

		const values = Array.from({ length: 200 }, () => random.int(3, 5))

		expect(new Set(values)).toEqual(new Set([3, 4, 5]))
	})
})

describe('the people of the demos', () => {
	it('gives the named people first, with an email of the first name (CONVENTIONS.md §13.8)', () => {
		expect(people(8)).toEqual(profiles)

		for (const { name, email } of profiles) {
			expect(email).toBe(`${name.split(' ')[0]?.toLowerCase()}@example.com`)
		}
	})

	it('gives the same generated person for the same id', () => {
		expect(person(9)).toEqual(person(9))

		expect(person(9)).toMatchObject({ id: 9, name: 'Person 9', email: 'person9@example.com' })
	})
})
