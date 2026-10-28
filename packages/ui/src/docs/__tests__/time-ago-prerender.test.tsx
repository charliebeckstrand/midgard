// @vitest-environment jsdom
// `serverMarkup` parses the server markup into a DOM node.

import type { ComponentType } from 'react'
import { describe, expect, it } from 'vitest'
import { serverMarkup } from '../../__tests__/helpers/hydrate.tsx'
import { allBySlot, bySlot } from '../../__tests__/helpers/slot-queries.ts'
import CustomFormat from '../pages/components/time-ago/custom-format.tsx'
import CustomLocale from '../pages/components/time-ago/custom-locale.tsx'
import Future from '../pages/components/time-ago/future.tsx'
import Past from '../pages/components/time-ago/past.tsx'
import WithAbsoluteTime from '../pages/components/time-ago/with-absolute-time.tsx'

// TimeAgo writes its text only after the mount. Each TimeAgo example renders
// its rows in the prerender, and each row holds a skeleton line, so the page
// does not grow when the clock starts.

const examples: [string, ComponentType, number][] = [
	['Past', Past, 5],
	['Future', Future, 3],
	['CustomFormat', CustomFormat, 1],
	['WithAbsoluteTime', WithAbsoluteTime, 1],
	['CustomLocale', CustomLocale, 3],
]

describe('TimeAgo examples in the prerender', () => {
	it.each(examples)('%s renders each row with a skeleton line', (_, Example, rows) => {
		const items = allBySlot(serverMarkup(<Example />), 'time-ago')

		expect(items).toHaveLength(rows)

		for (const item of items) expect(bySlot(item, 'placeholder')).not.toBeNull()
	})
})
