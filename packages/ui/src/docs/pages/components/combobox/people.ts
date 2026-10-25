import { profiles } from '../../../data/people.ts'

// The names of the people, in alphabetical order.
export const people = profiles.map(({ name }) => name).toSorted()
