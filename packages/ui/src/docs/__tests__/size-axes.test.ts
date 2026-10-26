// @vitest-environment node
import { afterAll, describe, expect, it } from 'vitest'
import { SIZE_AXES } from '../../__tests__/helpers/size-axes.ts'
import { uiRoot } from '../../__tests__/helpers/walk-source.ts'
import { type DensityStep, densitySteps, isDensityStep } from '../../core/density/steps.ts'
import { createApiExtractor, type PropApi } from '../plugin/api.ts'
import { barrels } from './barrels.ts'

// The distinct-steps gate renders each step of each `size` axis in
// `SIZE_AXES`. This test holds that list equal to the API data that the docs
// plugin makes, so the gate cannot miss an axis. A `size` axis is a `size`
// prop whose string literals are all density steps. A number member, as on
// Icon, does not count.

// The folders whose units have API data, as `src/<root>/<name>/index.ts`.
const ROOTS = ['components', 'modules', 'structure']

const extractor = createApiExtractor(uiRoot)

afterAll(() => extractor.close())

/**
 * The string literals of a prop. A union of literals gives them in `values`.
 * A union with another member, such as `'sm' | 'md' | number`, gives its text
 * in `type`.
 */
function getStrings(prop: PropApi): string[] {
	if (prop.values) return prop.values.filter((value) => typeof value === 'string')

	return (prop.type ?? '')
		.split('|')
		.map((member) => member.trim())
		.flatMap((member) => /^'([^']*)'$/.exec(member)?.[1] ?? [])
}

/** The steps of each `size` axis in the API data, in step order. */
async function sizeAxesOfApi(): Promise<Record<string, DensityStep[]>> {
	const axes: Record<string, DensityStep[]> = {}

	for (const barrel of barrels(ROOTS)) {
		for (const component of Object.values(await extractor.extract(barrel))) {
			const size = component.props.find((prop) => prop.name === 'size')

			const literals = size ? getStrings(size) : []

			if (literals.length === 0 || !literals.every(isDensityStep)) continue

			axes[component.name] = densitySteps.filter((step) => literals.includes(step))
		}
	}

	return axes
}

describe('size axes', () => {
	it('lists each size axis of the API data', { timeout: 60_000 }, async () => {
		const listed = Object.fromEntries(
			Object.entries(SIZE_AXES).map(([name, steps]) => [name, [...steps]]),
		)

		expect(listed).toEqual(await sizeAxesOfApi())
	})
})
