// @vitest-environment jsdom
// The helper that this file calls (`page-smoke.tsx`) renders each page.

import { describe, expect, it } from 'vitest'
import { describePageSmoke, docsPages, moduleOf, otherPages, pageModules } from './page-smoke.tsx'

// The smoke test (`page-smoke.tsx`) for the pages that are not in `modules/`,
// and the check that the two files of the test walk each module in `pages/`.

describe('page modules', () => {
	it('walks each page module and each tab module', () => {
		const walked = docsPages.flatMap(({ folder, tabs }) => [
			moduleOf(folder),
			...tabs.map((tab) => moduleOf(`${folder}/${tab}`)),
		])

		expect(walked.toSorted()).toEqual(pageModules)
	})
})

describePageSmoke(otherPages)
