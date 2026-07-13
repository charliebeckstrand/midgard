import { createModuleResolver, deriveDocMeta, parseDoc } from '../parse'

const FIXTURE = `---
usage:
  domain: commerce
---

# Button

The primary action control.

## Overview

A polymorphic control that renders a button or a link.

## Usage

Reach for it for actions; render it as a link for navigation.
`

describe('parseDoc', () => {
	it('parses the name, description, and front-matter', () => {
		const doc = parseDoc(FIXTURE, 'button.md')

		expect(doc.name).toBe('Button')

		expect(doc.description).toBe('The primary action control.')

		expect(doc.frontMatter.usage).toEqual({ domain: 'commerce' })
	})

	it('splits the body into ## sections, keyed by lowercased heading', () => {
		const doc = parseDoc(FIXTURE, 'button.md')

		expect(doc.sections.overview).toBe('A polymorphic control that renders a button or a link.')

		expect(doc.sections.usage).toBe('Reach for it for actions; render it as a link for navigation.')

		// The heading and the description belong to neither section body.
		expect(doc.sections.overview).not.toContain('## Overview')

		expect(doc.sections.overview).not.toContain('The primary action control')
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
