// @vitest-environment node
import { parse } from '@formatjs/icu-messageformat-parser'
import type { Alias } from 'vite'
import { describe, expect, it } from 'vitest'
import { precompileMessages } from '../plugin/messages.ts'

type Handler = (code: string, id: string) => { code: string } | null

const plugin = precompileMessages()

/** The transform of the plugin, on `code` at `id`. */
function transform(code: string, id: string): string | undefined {
	const { handler } = plugin.transform as unknown as { handler: Handler }

	return handler(code, id)?.code
}

const MODULE = [
	'const messages = defineMessages({',
	"\tclose: { id: 'docs.close', defaultMessage: 'Close {name}', description: 'A note.' },",
	'})',
].join('\n')

describe('precompileMessages', () => {
	it('precompiles each descriptor of a module, also of a module copy', () => {
		for (const id of ['/docs/kit/names.ts', '/docs/pages/button/with-icon.tsx?lang=es']) {
			const output = transform(MODULE, id)

			expect(output).toContain(`defaultMessage: ${JSON.stringify(parse('Close {name}'))}`)

			expect(output).not.toContain('description')
		}
	})

	it('precompiles each message of a translation', () => {
		const output = transform('{"docs.close":"Cerrar {name}"}', '/docs/lang/es.json')

		expect(JSON.parse(output ?? '')).toEqual({ 'docs.close': parse('Cerrar {name}') })
	})

	it('leaves a module with no message and a JSON file that is not a translation', () => {
		expect(transform('export const a = 1', '/docs/kit/a.ts')).toBeUndefined()

		expect(transform('{"a":"{b}"}', '/docs/data/cities.json')).toBeUndefined()
	})

	it('gives the no-parser entry of ui for the parser, and not for its subpaths', () => {
		const config = (plugin.config as () => { resolve: { alias: Alias[] } })()

		const [{ find, replacement }] = config.resolve.alias as [Alias]

		expect(replacement).toMatch(/\/src\/primitives\/intl\/intl-no-parser\.ts$/)

		expect('@formatjs/icu-messageformat-parser').toMatch(find)

		expect('@formatjs/icu-messageformat-parser/no-parser.js').not.toMatch(find)
	})
})
