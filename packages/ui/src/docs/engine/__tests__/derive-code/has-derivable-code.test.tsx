import { describe, expect, it } from 'vitest'
import { deriveCode, hasDerivableCode } from '../../derive-code'
import { tag } from './helpers'

// `hasDerivableCode` exists to answer "would `deriveCode` return anything?"
// without paying for the derivation, so every case here asserts the two agree.
describe('hasDerivableCode', () => {
	const Button = tag<{ children?: React.ReactNode }>('Button', 'button')

	function agrees(node: React.ReactNode) {
		const derived = deriveCode(node) !== null

		expect(hasDerivableCode(node)).toBe(derived)

		return derived
	}

	it('finds a tagged element at the root', () => {
		expect(agrees(<Button>Save</Button>)).toBe(true)
	})

	it('finds a tagged element nested under untagged wrappers', () => {
		expect(
			agrees(
				<div>
					<section>
						<Button>Save</Button>
					</section>
				</div>,
			),
		).toBe(true)
	})

	it('finds a tagged element inside an array of children', () => {
		expect(agrees(<div>{[<Button key="a">Save</Button>, <span key="b">text</span>]}</div>)).toBe(
			true,
		)
	})

	it('reports nothing for a subtree with no tagged element', () => {
		expect(
			agrees(
				<div>
					<span>plain</span>
				</div>,
			),
		).toBe(false)
	})

	it('reports nothing for text-only and empty children', () => {
		expect(agrees('just text')).toBe(false)

		expect(agrees(null)).toBe(false)
	})
})
