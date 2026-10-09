// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { valuesByStep } from '../../core/density/steps'
import {
	docsSites,
	isSourceFile,
	srcDir,
	srcRelative,
	stripSourceComments,
	walkSource,
} from '../helpers/walk-source'

// A ramp is the one place that writes a value for each density step, and a
// size scale (`defineScale`) reads its steps from the ramps. Three rules hold
// that design:
//
//   - Each ramp has three or five values. The utility writes no rule for a list
//     of another length, so such a list fails with no sign.
//   - A ramp lives in `recipes/kiso/dan/`. A kata, a skeleton dimension, or a
//     component imports the ramp and writes no list of its own.
//   - No file outside the density core picks or clamps steps by hand. A `size`
//     prop takes `ScaleStep<typeof scale>`, and a JS reader snaps its step
//     with `snapToScale`.
//
// The scan reads the code of the `ui` package with the comments removed. It
// leaves out the density core, which defines the steps, and the docs site,
// which is a consumer of the package.

/** The code of each source file of the package, with the comments removed. */
const sources: { file: string; code: string }[] = []

walkSource(
	srcDir,
	(file, content) => {
		const path = srcRelative(file)

		if (!isSourceFile(file) || path.startsWith('core/density/')) return

		sources.push({ file: path, code: stripSourceComments(content) })
	},
	docsSites,
)

/** The count of the matches of `pattern` in each file, for the files with a match. */
function countsOf(pattern: RegExp, files = sources): Record<string, number> {
	return Object.fromEntries(
		files
			.map(({ file, code }) => [file, code.match(pattern)?.length ?? 0] as const)
			.filter(([, count]) => count > 0)
			.sort(([a], [b]) => a.localeCompare(b)),
	)
}

/** A stepped utility with its list, such as `density-p-[2,3,4]`. */
const RAMP = /\bdensity-[a-z]+(?:-[a-z]+)*-\[([^\]\s'"`]*)\]/g

/** A ramp with its variant prefix, such as `lg:density-pt-[4,6,8]`. */
const RAMP_CLASS = /[^\s'"`]*density-[a-z]+(?:-[a-z]+)*-\[[^\]\s'"`]*\]/g

/** The home of the ramps. */
const RAMP_HOME = 'recipes/kiso/dan/'

/**
 * A step picked by hand: a comparison with an outer step, a clamp outside the
 * core, or a `size` prop typed with a step type or with step literals.
 */
const HAND_STEP = new RegExp(
	[
		String.raw`[=!]==\s*'(?:xs|xl)'`,
		String.raw`'(?:xs|xl)'\s*[=!]==`,
		String.raw`\b(?:toInnerStep|stepDown|slotStep)\(`,
		String.raw`\bsize\??:\s*(?:DensityStep|InnerStep)\b`,
		String.raw`\bsize\??:\s*'(?:xs|sm|md|lg|xl)'(?:\s*\|\s*'(?:xs|sm|md|lg|xl)')+`,
	].join('|'),
	'g',
)

describe('size scale', () => {
	it('reads the source of the package', () => {
		// A walk that read no file would pass each case below with an empty map.
		expect(sources.length).toBeGreaterThan(500)
	})

	it('gives each ramp three or five values', () => {
		const broken = sources.flatMap(({ file, code }) =>
			Array.from(code.matchAll(RAMP), ([ramp, list]) =>
				valuesByStep(list ?? '') ? [] : [`${file}: ${ramp}`],
			).flat(),
		)

		expect(broken).toEqual([])
	})

	it('writes a ramp only in the home of the ramps', () => {
		const outside = sources.filter(({ file }) => !file.startsWith(RAMP_HOME))

		expect(countsOf(RAMP, outside)).toEqual({})
	})

	it('writes each ramp once in the home of the ramps', () => {
		// Two names for one class would let one name change and leave the other.
		// The variant forms of one list, such as `lg:density-pt-[4,6,8]`, are
		// different classes, because Tailwind reads each form as a literal.
		const home = sources.filter(({ file }) => file.startsWith(RAMP_HOME))

		const ramps = home.flatMap(({ code }) =>
			Array.from(code.matchAll(RAMP_CLASS), ([ramp]) => ramp),
		)

		const twice = ramps.filter((ramp, index) => ramps.indexOf(ramp) !== index)

		expect(ramps.length).toBeGreaterThan(0)

		expect(twice).toEqual([])
	})

	it('picks no step by hand outside the density core', () => {
		expect(countsOf(HAND_STEP)).toEqual({})
	})
})
