import { ts } from 'ts-morph'
import { describe, expect, it } from 'vitest'
import {
	extractDocFromParts,
	extractDocFromText,
	type LinkResolver,
} from '../../../docs/api-reference/engine/extract-doc'
import { createInMemoryProgram } from './helpers'

/** A resolver that knows only `KbdProps`, so tests exercise hit and miss paths. */
const resolve: LinkResolver = (name) =>
	name === 'KbdProps'
		? { signature: 'type KbdProps', summary: 'Props for the kbd component.' }
		: null

describe('extractDocFromText', () => {
	it('resolves a known link and keys it by target name', () => {
		const doc = extractDocFromText('Hint built on {@link KbdProps}.', resolve)

		expect(doc.description).toBe('Hint built on {@link KbdProps}.')

		expect(doc.links?.KbdProps).toEqual({
			signature: 'type KbdProps',
			summary: 'Props for the kbd component.',
		})
	})

	it('normalizes the pipe-label form while keying the link by its target', () => {
		const doc = extractDocFromText('Same as {@link KbdProps | the kbd props}.', resolve)

		expect(doc.description).toBe('Same as {@link KbdProps|the kbd props}.')

		expect(doc.links?.KbdProps?.signature).toBe('type KbdProps')
	})

	it('normalizes the legacy space-label form', () => {
		const doc = extractDocFromText('Same as {@link KbdProps the kbd props}.', resolve)

		expect(doc.description).toBe('Same as {@link KbdProps|the kbd props}.')
	})

	it('leaves URL links unresolved, keeping the token in the description', () => {
		const doc = extractDocFromText('See {@link https://example.com}.', resolve)

		expect(doc.description).toBe('See {@link https://example.com}.')

		expect(doc.links).toBeUndefined()
	})

	it('keeps an unknown target as a token but emits no link entry', () => {
		const doc = extractDocFromText('See {@link Missing}.', resolve)

		expect(doc.description).toBe('See {@link Missing}.')

		expect(doc.links).toBeUndefined()
	})

	it('returns plain prose with no link map when no `{@link}` is present', () => {
		const doc = extractDocFromText('Just prose.', resolve)

		expect(doc.description).toBe('Just prose.')

		expect(doc.links).toBeUndefined()
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

		const doc = extractDocFromParts(bar.getDocumentationComment(program.checker), resolve)

		// The lossy `displayPartsToString` path yields `KbdPropsthe kbd props`; the
		// rebuilt token keeps the target and label apart.
		expect(doc.description).toBe('Same as {@link KbdProps|the kbd props}.')

		expect(doc.links?.KbdProps?.signature).toBe('type KbdProps')
	})
})
