import { describe, expect, it } from 'vitest'
import { defaultRegistry, deriveCode, hasDerivableCode } from '../../derive-code'
import type { ComponentInfo, ComponentRegistry } from '../../derive-code/types'
import { external, tag } from './helpers'

// `hasDerivableCode` exists to answer "would `deriveCode` return anything?"
// without paying for the derivation, so every case here asserts the two agree.
describe('hasDerivableCode', () => {
	const Button = tag<{ children?: React.ReactNode }>('Button', 'button')

	function agrees(node: React.ReactNode, registry: ComponentRegistry = defaultRegistry) {
		const derived = deriveCode(node, registry) !== null

		expect(hasDerivableCode(node, registry)).toBe(derived)

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

	// The probe must resolve the way the real walk does. Reading build-time tags
	// alone would miss an external component, which carries only a `displayName`
	// — so an icons-only demo would report `false` and hide a code block
	// `deriveCode` would have filled.
	it('finds an external component matched by displayName', () => {
		const Icon = external<Record<string, never>>('CheckIcon')

		const registry: ComponentRegistry = {
			...defaultRegistry,
			byName: new Map<string, ComponentInfo>([
				['CheckIcon', { name: 'CheckIcon', module: 'lucide-react', external: true }],
			]),
		}

		expect(agrees(<Icon />, registry)).toBe(true)
	})
})
