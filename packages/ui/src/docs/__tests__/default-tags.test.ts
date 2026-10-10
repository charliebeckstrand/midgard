// @vitest-environment node
import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { isDensityStep } from '../../core/density/steps.ts'
import { createApiExtractor, type PropApi } from '../plugin/api.ts'

// The playground shows what a component renders when a prop is omitted. It
// reads the `@defaultValue` tag of each prop whose type is a union of
// literals. A tag that is code names the value. A tag that is a sentence and
// starts with code names the value that the component takes when no context
// sets it. Any other sentence tells the playground that the omitted prop is
// no value, and the field shows "None". A prop with no tag would show "None"
// in error, so this test finds it. A density step needs no tag, because the
// playground takes the step of the scope.

const UI_ROOT = path.resolve(import.meta.dirname, '..', '..', '..')

// The folders whose units have API data, as `src/<root>/<name>/index.ts`.
const ROOTS = ['components', 'modules', 'primitives', 'providers', 'structure']

const extractor = createApiExtractor(UI_ROOT)

afterAll(() => extractor.close())

/** Each barrel of `ROOTS`, such as `components/button`. */
function barrels(): string[] {
	return ROOTS.flatMap((root) =>
		readdirSync(path.join(UI_ROOT, 'src', root), { withFileTypes: true })
			.filter(
				(entry) =>
					entry.isDirectory() &&
					existsSync(path.join(UI_ROOT, 'src', root, entry.name, 'index.ts')),
			)
			.map((entry) => `${root}/${entry.name}`),
	)
}

/** Whether the prop has a `@defaultValue` tag: code in `default`, or a sentence at the end of `description`. */
function isTagged(prop: PropApi): boolean {
	return prop.default !== undefined || /(^|\n\n)Default: /.test(prop.description ?? '')
}

/** Whether the strings of the prop are all density steps, as on a `size` axis. */
function isDensityAxis(prop: PropApi): boolean {
	const strings = (prop.values ?? []).filter((value) => typeof value === 'string')

	return strings.length > 0 && strings.every(isDensityStep)
}

/** Each optional union of literals with no tag, as `Component.prop`. */
async function untagged(): Promise<string[]> {
	const found: string[] = []

	for (const barrel of barrels()) {
		for (const component of Object.values(await extractor.extract(barrel))) {
			for (const prop of component.props) {
				if (!prop.values || prop.required || prop.deprecated !== undefined) continue

				if (isDensityAxis(prop) || isTagged(prop)) continue

				found.push(`${component.name}.${prop.name}`)
			}
		}
	}

	return found
}

describe('default tags', () => {
	it('tags the default of each optional union of literals', { timeout: 120_000 }, async () => {
		expect(await untagged()).toEqual([])
	})
})
