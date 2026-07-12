import { deriveDocMeta, parseDoc } from '../engine/parse'

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

	it('rejects an invalid kind', () => {
		expect(() => parseDoc('---\nkind: widget\n---\n\n# N\n\nD.\n', 'bad.md')).toThrow(
			/kind must be one of/,
		)
	})
})

describe('deriveDocMeta', () => {
	const parsed = parseDoc('# Button\n\nA button.\n', 'button.md')

	it('derives component identity from the path', () => {
		expect(deriveDocMeta('components/button.md', parsed)).toMatchObject({
			id: 'components/button',
			category: 'components',
			slug: 'button',
			module: 'ui/button',
			kind: 'component',
		})
	})

	it('derives barrel-surface modules from the category', () => {
		expect(deriveDocMeta('hooks/use-controllable.md', parsed)).toMatchObject({
			module: 'ui/hooks',
			kind: 'hook',
		})

		expect(deriveDocMeta('core/announce.md', parsed)).toMatchObject({
			module: 'ui/core',
			kind: 'function',
		})
	})

	it('derives per-directory modules for modules, providers, and primitives', () => {
		expect(deriveDocMeta('modules/grid.md', parsed).module).toBe('ui/modules/grid')

		expect(deriveDocMeta('providers/toast.md', parsed).module).toBe('ui/providers/toast')

		expect(deriveDocMeta('primitives/polymorphic.md', parsed).module).toBe(
			'ui/primitives/polymorphic',
		)
	})

	it('supports directory docs via index.md', () => {
		expect(deriveDocMeta('modules/grid/index.md', parsed)).toMatchObject({
			id: 'modules/grid',
			slug: 'grid',
		})
	})

	it('falls back to the function kind for unknown categories', () => {
		expect(deriveDocMeta('recipes/kata.md', parsed)).toMatchObject({
			module: 'ui/kata',
			kind: 'function',
		})
	})

	it('lets front-matter override module and kind', () => {
		const overridden = parseDoc(
			'---\nmodule: ui/modules/chart\nkind: module\n---\n\n# Chart\n\nA chart.\n',
			'chart.md',
		)

		expect(deriveDocMeta('components/chart.md', overridden)).toMatchObject({
			module: 'ui/modules/chart',
			kind: 'module',
		})
	})

	it('honors a custom package name', () => {
		expect(deriveDocMeta('components/button.md', parsed, 'grid').module).toBe('grid/button')
	})
})
