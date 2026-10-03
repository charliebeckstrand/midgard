// @vitest-environment node
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { type DensityStep, densitySteps } from '../../core/density'
import { isDensityStep } from '../../core/density/steps'
import { buildApi } from '../../docs/engine/api-reference/engine/build-api'
import { SIZE_AXES } from '../helpers/size-axes'

// The distinct-steps gate renders each step of each `size` axis in
// `SIZE_AXES`. This test holds that list equal to the API that the docs site
// builds, so the gate cannot miss an axis. A `size` axis is a `size` prop
// whose string literals are all density steps. A number member, as on Icon,
// does not count.

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/** The string literals of a type, such as `'sm' | 'md' | number`. */
function stringLiteralsOf(type: string): string[] {
	return type
		.split('|')
		.map((member) => member.trim())
		.flatMap((member) => /^'([^']*)'$/.exec(member)?.[1] ?? [])
}

/** The steps of each `size` axis in the API, in step order. */
function sizeAxesOfApi(): Record<string, DensityStep[]> {
	const axes: Record<string, DensityStep[]> = {}

	for (const components of Object.values(buildApi(SRC))) {
		for (const component of components ?? []) {
			const size = component.props.find((prop) => prop.name === 'size')

			const literals = size ? stringLiteralsOf(size.type) : []

			if (literals.length === 0 || !literals.every(isDensityStep)) continue

			axes[component.name] = densitySteps.filter((step) => literals.includes(step))
		}
	}

	return axes
}

describe('size axes', () => {
	it('lists each size axis of the documented API', { timeout: 60_000 }, () => {
		const listed = Object.fromEntries(
			Object.entries(SIZE_AXES).map(([name, steps]) => [name, [...steps]]),
		)

		expect(listed).toEqual(sizeAxesOfApi())
	})
})
