import { cleanup, render } from '@testing-library/react'
import { bench, describe } from 'vitest'
import { QueryBuilder } from '../components/query-builder'
import { makeQueryTree, QUERY_FIELDS } from './fixtures'

// Complements query-builder.bench.ts: this measures the full render cost of
// the recursive QueryGroup/QueryRule tree, not just tree utilities.

const shallowWide = makeQueryTree(1, 10) // 10 rules
const balanced = makeQueryTree(2, 4) // ~16 rules in 4 groups
const deepWide = makeQueryTree(3, 4) // ~64 rules in 16 groups

describe('QueryBuilder · initial render', () => {
	bench('shallow-wide (10 rules)', () => {
		render(<QueryBuilder fields={QUERY_FIELDS} value={shallowWide} />)

		cleanup()
	})

	bench('balanced (~16 rules)', () => {
		render(<QueryBuilder fields={QUERY_FIELDS} value={balanced} />)

		cleanup()
	})

	bench('deep-wide (~64 rules)', () => {
		render(<QueryBuilder fields={QUERY_FIELDS} value={deepWide} />)

		cleanup()
	})
})
