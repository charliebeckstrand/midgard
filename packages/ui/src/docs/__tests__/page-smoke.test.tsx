// @vitest-environment jsdom
// The helper that this file calls (`page-smoke.tsx`) renders each page.

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { describePageSmoke, docsPages, moduleOf, pageModules, smokeParts } from './page-smoke.tsx'

// The smoke test (`page-smoke.tsx`) for the first part of the pages, and the
// checks that the files of the test walk each module in `pages/`.

describe('page modules', () => {
	it('walks each page module and each tab module', () => {
		const walked = docsPages.flatMap(({ folder, tabs }) => [
			moduleOf(folder),
			...tabs.map((tab) => moduleOf(`${folder}/${tab}`)),
		])

		expect(walked.toSorted()).toEqual(pageModules)
	})

	it('runs each page in exactly one part, and each part in a file of its own', () => {
		const parted = Object.values(smokeParts).flatMap((part) => part.map(({ path }) => path))

		expect(parted.toSorted()).toEqual(docsPages.map(({ path }) => path).toSorted())

		const unrun = Object.keys(smokeParts).filter((name) => {
			const file = join(import.meta.dirname, `${name}.test.tsx`)

			return !existsSync(file) || !readFileSync(file, 'utf8').includes(`smokeParts['${name}']`)
		})

		expect(unrun, 'parts that no file runs').toEqual([])
	})
})

describePageSmoke(smokeParts['page-smoke'] ?? [])
