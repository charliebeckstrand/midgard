// @vitest-environment node

import { createElement, Fragment, type FunctionComponent, type ReactNode } from 'react'
import { bench, describe, vi } from 'vitest'

// `deriveCode` imports `virtual:component-modules` indirectly via its registry.
// In a bare-node bench environment the Vite plugin never runs; an empty record
// stands in. The measured walk reads tags off element types (set per-fixture
// below) and never consults this map.
vi.mock('virtual:component-modules', () => ({ default: {} as Record<string, string> }))

const { deriveCode } = await import('../../docs/derive-code')

// ---------------------------------------------------------------------------
// Tagged component factory
// ---------------------------------------------------------------------------

type Tagged = FunctionComponent<{ children?: ReactNode }> & { __module: string; __name: string }

function tag(name: string, module = 'ui/components'): Tagged {
	const Component = (() => null) as unknown as Tagged

	Component.__module = module
	Component.__name = name

	return Component
}

const Button = tag('Button')
const Card = tag('Card')
const Icon = tag('Icon')
const Stack = tag('Stack')
const Text = tag('Text')

// ---------------------------------------------------------------------------
// Tree fixtures
//
// Sizes target the realistic spread of demo complexity in `src/docs/demos/`:
//   small   ~10  recognized nodes  (e.g. a single-button demo)
//   medium  ~50  recognized nodes  (e.g. a populated card layout)
//   heavy   ~200 recognized nodes  (e.g. data-table or query-builder demos)
// ---------------------------------------------------------------------------

function makeSmall(): ReactNode {
	return createElement(Stack, null, [
		createElement(Button, { key: 'b' }, 'Click me'),
		createElement(Text, { key: 't' }, 'Hello'),
	])
}

function makeMedium(): ReactNode {
	const cards: ReactNode[] = []

	for (let i = 0; i < 10; i++) {
		cards.push(
			createElement(
				Card,
				{ key: `c-${i}` },
				createElement(Stack, null, [
					createElement(Icon, { key: 'i' }),
					createElement(Text, { key: 't' }, `Item ${i}`),
					createElement(Button, { key: 'b' }, 'Open'),
				]),
			),
		)
	}

	return createElement(Stack, null, cards)
}

function makeHeavy(): ReactNode {
	const rows: ReactNode[] = []

	for (let r = 0; r < 40; r++) {
		const cells: ReactNode[] = []

		for (let c = 0; c < 4; c++) {
			cells.push(
				createElement(
					Card,
					{ key: `c-${r}-${c}` },
					createElement(Stack, null, [
						createElement(Icon, { key: 'i' }),
						createElement(Text, { key: 't' }, `${r}.${c}`),
					]),
				),
			)
		}

		rows.push(createElement(Fragment, { key: `r-${r}` }, cells))
	}

	return createElement(Stack, null, rows)
}

const small = makeSmall()
const medium = makeMedium()
const heavy = makeHeavy()

// ---------------------------------------------------------------------------
// Benches
// ---------------------------------------------------------------------------

describe('docs: deriveCode walk', () => {
	bench('small (~10 nodes)', () => {
		deriveCode(small)
	})

	bench('medium (~50 nodes)', () => {
		deriveCode(medium)
	})

	bench('heavy (~200 nodes)', () => {
		deriveCode(heavy)
	})
})
