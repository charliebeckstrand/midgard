import { join } from 'node:path'
import { parse } from '@formatjs/icu-messageformat-parser'
import { describe, expect, it } from 'vitest'
import { compileDescriptors, compileTranslation } from '../../../scripts/intl-loader'
import {
	docsSites,
	isSourceFile,
	srcDir,
	walkSource,
	workspaceKey,
	workspaceRoot,
} from '../helpers/walk-source'

// Precompiled messages (`scripts/intl-loader.ts`).
//
// The Next build of each app runs the message loader on each module that
// defines messages, and it gives the bundle no message parser. A message that
// reaches FormatJS as text then shows as its raw text, such as
// "{count, plural, one {# row} other {# rows}}". So the loader stops the build
// when it cannot precompile a descriptor. This gate runs the loader on each
// module that an app can import, so that such a module fails here first.

// The trees that an app bundles: ui (without the docs site), `shared`, and the
// apps.
const SCAN_ROOTS: readonly [string, ReadonlySet<string> | undefined][] = [
	[srcDir, docsSites],
	[join(workspaceRoot, 'packages', 'shared', 'src'), undefined],
	[join(workspaceRoot, 'apps'), undefined],
]

describe('intl precompile boundary', () => {
	it('precompiles each defaultMessage and removes each description', () => {
		const source = [
			'// é … ≥ before the descriptors, so the offsets count UTF-16 units',
			'const messages = defineMessages({',
			'\tcount: {',
			"\t\tid: 'test.count',",
			"\t\tdefaultMessage: '{count, plural, one {# row} other {# rows}}',",
			"\t\tdescription: 'The count of the rows.',",
			'\t},',
			"\tplain: { description: `A note.`, id: 'test.plain', defaultMessage: `Close…` } as const,",
			'})',
			"const one = defineMessage<{ name: string }>({ id: 'test.one', defaultMessage: 'Hi {name}' })",
		].join('\n')

		const output = compileDescriptors(source, 'test.ts')

		expect(output).not.toContain('description')
		expect(output).toContain(
			`defaultMessage: ${JSON.stringify(parse('{count, plural, one {# row} other {# rows}}'))},`,
		)
		expect(output).toContain(`defaultMessage: ${JSON.stringify(parse('Close…'))} } as const`)
		expect(output).toContain(`defaultMessage: ${JSON.stringify(parse('Hi {name}'))} })`)
		expect(output.startsWith('// é … ≥')).toBe(true)
	})

	it('leaves a module with no message as it is', () => {
		const source = "const label = { defaultMessage: 'x', description: 'y' }"

		expect(compileDescriptors(source, 'test.ts')).toBe(source)
	})

	it('stops on a descriptor that it cannot precompile', () => {
		expect(() =>
			compileDescriptors("\ndefineMessages({ a: { id: 'a', defaultMessage: text } })", 'test.ts'),
		).toThrow('test.ts:2: a defaultMessage is not a string literal')

		expect(() => compileDescriptors('defineMessage(descriptor)', 'test.ts')).toThrow(
			'is not an object literal',
		)

		expect(() => compileDescriptors('defineMessages(set)', 'test.ts')).toThrow(
			'are not an object literal',
		)

		expect(() =>
			compileDescriptors("defineMessage({ id: 'a', defaultMessage: '{open' })", 'test.ts'),
		).toThrow('does not parse')
	})

	it('precompiles each message of a translation', () => {
		const output = compileTranslation('{"a":"Cerrar","b":"Fila {index, number}"}', 'es.json')

		expect(JSON.parse(output)).toEqual({ a: parse('Cerrar'), b: parse('Fila {index, number}') })
	})

	it('precompiles each module that an app bundles', () => {
		const failures: string[] = []

		let compiled = 0

		for (const [root, skip] of SCAN_ROOTS) {
			walkSource(
				root,
				(file, content) => {
					if (!isSourceFile(file) || /\.test\.[cm]?tsx?$/.test(file)) return

					try {
						if (compileDescriptors(content, file) !== content) compiled++
					} catch (error) {
						failures.push(`${workspaceKey(file)}: ${(error as Error).message}`)
					}
				},
				skip,
			)
		}

		expect(compiled).toBeGreaterThan(0)

		expect(
			failures,
			'modules with a descriptor that the loader cannot precompile (give each `defineMessage` and `defineMessages` call an object literal, with a string literal as each `defaultMessage`):',
		).toEqual([])
	})
})
