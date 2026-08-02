/**
 * JsonTree's render cost: the `JsonNode` recursion and `filterEntries` dominate
 * it, and `json-tree.bench.ts` isolates that pure logic one rung down. The
 * scenarios span expansion depth, an active search (highlight against prune),
 * and the virtualized window — plus a controlled toggle that re-renders a
 * mounted tree, where a memo regression on a single branch flip surfaces.
 */

import { describe } from 'vitest'
import { JsonTree } from '../components/json-tree'
import { collectPaths } from '../components/json-tree/json-tree-utilities'
import { noop } from '../utilities/noop'
import { JSON_TREES } from './fixtures'
import { mountBenches, rerenderBench } from './harness'

const { small, medium, large } = JSON_TREES

const DEEP = Number.POSITIVE_INFINITY

describe('JsonTree · render', () => {
	mountBenches(
		[
			{ label: 'small (d3×b5) · depth=1', data: small, depth: 1 },
			{ label: 'small (d3×b5) · fully expanded', data: small, depth: DEEP },
			{ label: 'medium (d4×b5) · depth=1', data: medium, depth: 1 },
			{ label: 'medium (d4×b5) · fully expanded', data: medium, depth: DEEP },
			{ label: 'large (d5×b5) · depth=2', data: large, depth: 2 },
		],
		({ label }) => label,
		({ data, depth }) => <JsonTree data={data} defaultExpandDepth={depth} />,
	)
})

describe('JsonTree · render with active search', () => {
	mountBenches(
		[
			{ label: 'search hits (filter=false)', search: 'value-root' },
			{ label: 'search hits (filter=true)', search: { value: 'value-root', filter: true } },
			{ label: 'search miss', search: '__absent__' },
		],
		({ label }) => `medium · ${label}`,
		({ search }) => <JsonTree data={medium} defaultExpandDepth={2} search={search} />,
	)
})

describe('JsonTree · virtualized render', () => {
	mountBenches(
		[
			{ label: 'medium (d4×b5)', data: medium },
			{ label: 'large (d5×b5)', data: large },
		],
		({ label }) => `${label} · depth=Infinity · virtualize`,
		({ data }) => (
			<JsonTree data={data} defaultExpandDepth={DEEP} virtualize={{ maxHeight: '600px' }} />
		),
	)
})

describe('JsonTree · virtualized · re-render on toggle', () => {
	// Controlled `expanded` flips one mid-tree branch per iteration, so the timed
	// region is the re-render alone — not the mount.
	const paths = [...collectPaths(medium, undefined, DEEP)]

	const branch = paths[Math.floor(paths.length / 2)] ?? paths[0] ?? ''

	const allExpanded = new Set(paths)

	const oneCollapsed = new Set(paths)

	oneCollapsed.delete(branch)

	const toggled = (expanded: Set<string>) => (
		<JsonTree
			data={medium}
			expanded={expanded}
			onExpandedChange={noop}
			virtualize={{ maxHeight: '2000px' }}
		/>
	)

	rerenderBench(
		'medium (d4×b5) · toggle one branch',
		() => toggled(oneCollapsed),
		(rerender, iteration) => rerender(toggled(iteration % 2 === 0 ? allExpanded : oneCollapsed)),
	)
})
