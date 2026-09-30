// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { ComponentApi } from '../../docs/engine/api-reference'
import { buildApi, listBarrels } from '../../docs/engine/api-reference/engine/build-api'
import { advise } from '../helpers/controlled-language'
import { propGaps, propsSetIn } from '../helpers/prop-coverage'

// `demo-coverage.test.ts` asks whether each component has a demo page. This test
// asks whether the page sets each documented prop of the components in its
// barrel. It is advisory: it writes each gap to the log and does not fail the
// run. A gap is a prop that the page does not show. `<Axes>` closes the gaps of
// the styling axes, and a hand-written `Example` closes the rest.

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

const DEMOS = join(SRC, 'docs', 'demos')

/** The `.tsx` files of a demo directory, and of each directory in it. */
function tsxFilesIn(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true, recursive: true })
		.filter((entry) => entry.isFile() && entry.name.endsWith('.tsx'))
		.map((entry) => join(entry.parentPath, entry.name))
}

/**
 * The demo sources of a barrel. `components/button` reads
 * `demos/components/button.tsx`, and `modules/grid` reads each file under
 * `demos/modules/grid/`. A few components have their page under `providers/`.
 */
function demoSourcesOf(rel: string): string[] {
	const name = rel.slice(rel.indexOf('/') + 1)

	const files = [join(DEMOS, `${rel}.tsx`), join(DEMOS, 'providers', `${name}.tsx`)].filter(
		existsSync,
	)

	const dir = join(DEMOS, rel)

	if (existsSync(dir)) files.push(...tsxFilesIn(dir))

	return files.map((file) => readFileSync(file, 'utf8'))
}

describe('prop coverage', () => {
	it('reports the documented props that a demo page does not set', { timeout: 60_000 }, () => {
		const api = buildApi(SRC)

		const gaps: string[] = []

		let documented = 0

		let unset = 0

		for (const { key, indexPath } of listBarrels(SRC)) {
			const components = api[key] ?? []

			const sources = demoSourcesOf(relative(SRC, dirname(indexPath)))

			if (sources.length === 0) continue

			for (const component of components) documented += component.props.length

			for (const gap of propGaps(sources, components)) {
				unset += gap.props.length

				gaps.push(`${key} › ${gap.component}: ${gap.props.join(', ')}`)
			}
		}

		expect(documented, 'no documented props found').toBeGreaterThan(0)

		advise(
			`${unset} of ${documented} documented props are not set on their demo page — add them to <Axes>, or show them in an Example`,
			gaps,
		)
	})
})

const api: ComponentApi[] = [
	{
		name: 'Thing',
		props: [
			{ name: 'variant', type: "'a' | 'b'" },
			{ name: 'href', type: "'x' | 'y'" },
			{ name: 'prefix', type: 'ReactNode' },
			{ name: 'label', type: 'string' },
			{ name: 'legacy', type: 'string', deprecated: true },
		],
	},
	{ name: 'ThingSkeleton', props: [{ name: 'size', type: "'sm' | 'md'" }] },
]

describe('prop coverage reader', () => {
	it('reads the attributes of each element', () => {
		const set = propsSetIn(['<Thing label="a" prefix={<Icon />}>x</Thing>'], api)

		expect([...(set.get('Thing') ?? [])]).toEqual(['label', 'prefix'])
	})

	it('reads the axes of an <Axes>, less its omit', () => {
		const set = propsSetIn(
			[`<Axes of="Thing" omit={['href']} render={(props) => <Thing {...props} />} />`],
			api,
		)

		expect([...(set.get('Thing') ?? [])]).toEqual(['variant'])
	})

	it('lists the props that no source sets, less the deprecated ones', () => {
		expect(propGaps(['<Thing variant="a" />'], api)).toEqual([
			{ component: 'Thing', props: ['href', 'prefix', 'label'] },
			{ component: 'ThingSkeleton', props: ['size'] },
		])
	})
})
