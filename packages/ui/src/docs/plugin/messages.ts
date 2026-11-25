import path from 'node:path'
import type { Plugin } from 'vite'
import { compileDescriptors, compileTranslation } from '../../../scripts/intl/loader.ts'

// The entry of ui that gives the parser of FormatJS without its parser.
const NO_PARSER = path.resolve(import.meta.dirname, '../../primitives/intl/intl-no-parser.ts')

// A TypeScript module, and a translation in a `lang` folder. The plugin tests
// the path of a module with no query, such as the `?lang=es` of a module copy.
const SOURCE = /\.tsx?$/

const TRANSLATION = /\/lang\/[a-z]{2,3}\.json$/

/**
 * Precompiles each message of the docs build, as the `turbopack` config of
 * `appConfig` in `auth` does for each app. The message loader of ui
 * (`scripts/intl/loader.ts`) changes each descriptor of a `defineMessage` or a
 * `defineMessages` call and each translation. Then the build gives the
 * `no-parser` entry of ui in place of the message parser, so that the shell
 * does not carry the parser.
 *
 * The plugin runs before the TypeScript transform and before the JSON plugin
 * of Vite, because the loader reads TypeScript and the JSON of a translation.
 * The tests of the docs do not load this plugin, so they keep the message text
 * and the parser.
 */
export function precompileMessages(): Plugin {
	return {
		name: 'vite-plugin-docs-precompile-messages',
		enforce: 'pre',
		config: () => ({
			resolve: {
				// Only the bare id: the `no-parser` entry imports a subpath of the parser.
				alias: [{ find: /^@formatjs\/icu-messageformat-parser$/, replacement: NO_PARSER }],
			},
		}),
		transform: {
			filter: { id: { exclude: /\/node_modules\// } },
			handler(code, id) {
				const [file = id] = id.split('?')

				if (TRANSLATION.test(file)) return { code: compileTranslation(code, file), map: null }

				if (!SOURCE.test(file)) return null

				const result = compileDescriptors(code, file)

				return result === code ? null : { code: result, map: null }
			},
		},
	}
}
