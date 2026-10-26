// @vitest-environment node
import type { ComponentType } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import CustomFormat from '../pages/components/time-ago/custom-format.tsx'
import CustomLocale from '../pages/components/time-ago/custom-locale.tsx'
import Future from '../pages/components/time-ago/future.tsx'
import Past from '../pages/components/time-ago/past.tsx'
import WithAbsoluteTime from '../pages/components/time-ago/with-absolute-time.tsx'

// TimeAgo writes its text only after the mount. Each TimeAgo example renders
// its rows in the prerender, and each row keeps one line, so the page does not
// grow when the clock starts.

const examples: [string, ComponentType, number][] = [
	['Past', Past, 5],
	['Future', Future, 3],
	['CustomFormat', CustomFormat, 1],
	['WithAbsoluteTime', WithAbsoluteTime, 1],
	['CustomLocale', CustomLocale, 3],
]

describe('TimeAgo examples in the prerender', () => {
	it.each(examples)('%s renders each row with one line', (_, Example, rows) => {
		const markup = renderToString(<Example />)

		const times = [...markup.matchAll(/<time [^>]*data-slot="time-ago"[^>]*>/g)].map(([tag]) => tag)

		expect(times).toHaveLength(rows)

		for (const tag of times) expect(tag).toContain('min-h-lh')
	})
})
