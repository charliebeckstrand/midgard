import { createModuleResolver, deriveDocMeta, parseDoc } from '../parse'

const FIXTURE = `---
usage:
  domain: commerce
---

# Button

Polymorphic action control with \`variant\` and \`size\` axes.

\`\`\`tsx
import { Button } from 'ui/button'
\`\`\`

## Variants

Five visual weights.

\`\`\`tsx preview title="Variants"
export default function Variants() {
	return null
}
\`\`\`

## Loading

\`\`\`tsx preview
export default function Loading() {
	return null
}
\`\`\`
`

describe('parseDoc', () => {
	it('parses name, description, fences, and sections', () => {
		const doc = parseDoc(FIXTURE, 'button.md')

		expect(doc.name).toBe('Button')

		expect(doc.description).toBe('Polymorphic action control with `variant` and `size` axes.')

		expect(doc.frontMatter.usage).toEqual({ domain: 'commerce' })

		expect(doc.previews).toHaveLength(2)

		expect(doc.previews[0]).toMatchObject({ title: 'Variants', section: 'Variants' })

		expect(doc.previews[1]).toMatchObject({ title: undefined, section: 'Loading' })

		expect(doc.body.map((segment) => segment.t)).toEqual([
			'snippet',
			'prose',
			'preview',
			'prose',
			'preview',
		])
	})

	it('keeps h2 headings inside prose segments', () => {
		const doc = parseDoc(FIXTURE, 'button.md')

		const prose = doc.body.filter((segment) => segment.t === 'prose')

		expect(prose[0]?.md).toContain('## Variants')

		expect(prose[0]?.md).toContain('Five visual weights.')
	})

	it('records the opening fence line for preview fences', () => {
		const doc = parseDoc(FIXTURE, 'button.md')

		const lines = FIXTURE.split('\n')

		for (const fence of doc.previews) {
			expect(lines[fence.line - 1]).toMatch(/^```tsx preview/)
		}
	})

	it('classifies bare fences as snippets', () => {
		const doc = parseDoc(FIXTURE, 'button.md')

		expect(doc.body[0]).toEqual({
			t: 'snippet',
			code: "import { Button } from 'ui/button'",
			lang: 'tsx',
		})
	})

	it('rejects a doc without an h1', () => {
		expect(() => parseDoc('Just prose.\n', 'bad.md')).toThrow(/bad\.md:1 .*h1/)
	})

	it('rejects a doc without a description paragraph', () => {
		expect(() => parseDoc('# Name\n\n## Section\n', 'bad.md')).toThrow(/description paragraph/)
	})

	it('rejects a second h1', () => {
		expect(() => parseDoc('# One\n\nDescription.\n\n# Two\n', 'bad.md')).toThrow(
			/bad\.md:5 multiple h1/,
		)
	})

	it('rejects unknown fence roles with a position', () => {
		const source = '# Name\n\nDescription.\n\n```tsx demo\nconst x = 1\n```\n'

		expect(() => parseDoc(source, 'bad.md')).toThrow(/bad\.md:5 unknown fence role "demo"/)
	})

	it('rejects unknown front-matter keys', () => {
		expect(() => parseDoc('---\ntitle: Nope\n---\n\n# Name\n\nDescription.\n', 'bad.md')).toThrow(
			/unknown front-matter key "title"/,
		)
	})

	it('rejects unknown usage keys', () => {
		const source = '---\nusage:\n  chaos: 11\n---\n\n# Name\n\nDescription.\n'

		expect(() => parseDoc(source, 'bad.md')).toThrow(/unknown usage key "chaos"/)
	})
})

describe('createModuleResolver', () => {
	const surface = [
		'ui/button',
		'ui/hooks',
		'ui/core',
		'ui/modules/grid',
		'ui/providers/toast',
		'ui/primitives/polymorphic',
	]

	const resolve = createModuleResolver(surface, 'ui')

	it('resolves a slug-named specifier for a component', () => {
		expect(resolve('components', 'button')).toBe('ui/button')
	})

	it('disambiguates a slug by category for a nested specifier', () => {
		expect(resolve('modules', 'grid')).toBe('ui/modules/grid')

		expect(resolve('providers', 'toast')).toBe('ui/providers/toast')

		expect(resolve('primitives', 'polymorphic')).toBe('ui/primitives/polymorphic')
	})

	it('falls back to the category barrel when no specifier names the slug', () => {
		expect(resolve('hooks', 'use-controllable')).toBe('ui/hooks')

		expect(resolve('core', 'announce')).toBe('ui/core')
	})

	it('returns undefined when nothing in the surface matches', () => {
		expect(resolve('widgets', 'nonexistent')).toBeUndefined()
	})
})

describe('deriveDocMeta', () => {
	const parsed = parseDoc('# Button\n\nA button.\n', 'button.md')

	const resolveModule = createModuleResolver(
		['ui/button', 'ui/hooks', 'ui/core', 'ui/modules/grid', 'ui/providers/toast'],
		'ui',
	)

	const opts = { packageName: 'ui', resolveModule }

	it('derives component identity from the path, module reconciled against the surface', () => {
		expect(deriveDocMeta('components/button.md', parsed, opts)).toMatchObject({
			id: 'components/button',
			category: 'components',
			slug: 'button',
			module: 'ui/button',
		})
	})

	it('reconciles barrel and nested modules through the resolver', () => {
		expect(deriveDocMeta('hooks/use-controllable.md', parsed, opts)).toMatchObject({
			module: 'ui/hooks',
		})

		expect(deriveDocMeta('modules/grid.md', parsed, opts).module).toBe('ui/modules/grid')
	})

	it('supports directory docs via index.md', () => {
		expect(deriveDocMeta('modules/grid/index.md', parsed, opts)).toMatchObject({
			id: 'modules/grid',
			slug: 'grid',
		})
	})

	it('falls back to `<pkg>/<slug>` for an unmatched category', () => {
		expect(deriveDocMeta('recipes/kata.md', parsed, { packageName: 'ui' }).module).toBe('ui/kata')
	})

	it('lets front-matter override the module', () => {
		const overridden = parseDoc(
			'---\nmodule: ui/modules/chart\n---\n\n# Chart\n\nA chart.\n',
			'chart.md',
		)

		expect(deriveDocMeta('components/chart.md', overridden, opts).module).toBe('ui/modules/chart')
	})

	it('honors a custom package name in the fallback', () => {
		expect(deriveDocMeta('components/button.md', parsed, { packageName: 'grid' }).module).toBe(
			'grid/button',
		)
	})
})
