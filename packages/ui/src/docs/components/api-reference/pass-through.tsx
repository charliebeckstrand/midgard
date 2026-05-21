'use client'

import { Fragment } from 'react'
import { Code } from '../../../components/code'
import type { PassThrough } from '../../api-reference/types'

/** Footer line that names the inherited DOM elements below the props table. */
export function PassThroughNote({ entries }: { entries: readonly PassThrough[] }) {
	if (entries.length === 0) return null

	return (
		<div className="flex flex-wrap items-center gap-sm text-sm text-zinc-600 dark:text-zinc-400">
			<span>Also accepts all</span>
			{entries.map((pt, i) => (
				<Fragment key={pt.element}>
					<Code className="font-mono dark:text-white">{`<${pt.element}>`}</Code>
					{i < entries.length - 1 && <span>,</span>}
				</Fragment>
			))}
			<span>HTML attributes.</span>
		</div>
	)
}
