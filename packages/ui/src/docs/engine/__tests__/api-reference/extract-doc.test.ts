// @vitest-environment node
import { ts } from 'ts-morph'
import { describe, expect, it } from 'vitest'
import { extractDocFromParts, extractDocFromText } from '../../api-reference/engine/extract-doc'
import { createInMemoryProgram } from './helpers'

describe('extractDocFromText', () => {
	it('keeps a symbol link as a canonical token', () => {
		const doc = extractDocFromText('Hint built on {@link KbdProps}.')

		expect(doc.description).toBe('Hint built on {@link KbdProps}.')
	})

	it('normalizes the pipe-label form', () => {
		const doc = extractDocFromText('Same as {@link KbdProps | the kbd props}.')

		expect(doc.description).toBe('Same as {@link KbdProps|the kbd props}.')
	})

	it('normalizes the legacy space-label form', () => {
		const doc = extractDocFromText('Same as {@link KbdProps the kbd props}.')

		expect(doc.description).toBe('Same as {@link KbdProps|the kbd props}.')
	})

	it('keeps a URL link as a token in the description', () => {
		const doc = extractDocFromText('See {@link https://example.com}.')

		expect(doc.description).toBe('See {@link https://example.com}.')
	})

	it('keeps an unknown target as a token', () => {
		const doc = extractDocFromText('See {@link Missing}.')

		expect(doc.description).toBe('See {@link Missing}.')
	})

	it('returns plain prose unchanged when no `{@link}` is present', () => {
		const doc = extractDocFromText('Just prose.')

		expect(doc.description).toBe('Just prose.')
	})
})

describe('extractDocFromParts', () => {
	it('rebuilds the link `displayPartsToString` would mangle', () => {
		const program = createInMemoryProgram({
			'index.ts': [
				`export type KbdProps = { keys: string }`,
				`export type Foo = {`,
				`  /** Same as {@link KbdProps | the kbd props}. */`,
				`  bar?: string`,
				`}`,
			].join('\n'),
		})

		const sf = program.sourceFiles['index.ts']

		if (!sf) throw new Error('index.ts not found')

		const fooAlias = sf.statements.find(
			(s): s is ts.TypeAliasDeclaration => ts.isTypeAliasDeclaration(s) && s.name.text === 'Foo',
		)

		if (!fooAlias) throw new Error('expected a Foo type alias')

		const bar = program.checker.getTypeAtLocation(fooAlias).getProperty('bar')

		if (!bar) throw new Error('expected a `bar` property')

		const doc = extractDocFromParts(bar.getDocumentationComment(program.checker))

		// The lossy `displayPartsToString` path yields `KbdPropsthe kbd props`; the
		// rebuilt token keeps the target and label apart.
		expect(doc.description).toBe('Same as {@link KbdProps|the kbd props}.')
	})
})
