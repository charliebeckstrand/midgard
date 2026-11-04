import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { endStaleBuildWatch } from '../app/stale-build.tsx'

// The head script loads as a file before the module scripts. It shares the
// guard key with `stale-build.tsx`, and the client entry ends its watch.

const HEAD_SCRIPT = readFileSync(
	path.join(import.meta.dirname, '..', 'app', 'stale-build-head.js'),
	'utf8',
)

/** Runs the head script, as the parser does, and adds a module script whose load fails. */
function failModuleLoad() {
	new Function(HEAD_SCRIPT)()

	const script = document.createElement('script')

	script.type = 'module'

	script.src = '/assets/entry.client-gone.js'

	document.head.append(script)

	return script
}

afterEach(() => {
	sessionStorage.clear()

	for (const script of document.head.querySelectorAll('script')) script.remove()

	window.__staleBuild?.()
})

describe('the head script of the stale build', () => {
	// A recent reload stops the next one, so the page does not loop. The key of
	// the guard is the key of `stale-build.tsx`, or the script would reload.
	it('fetches the module files again with no reload inside the guard', () => {
		const fetch = vi.fn(() => Promise.resolve(new Response()))

		vi.stubGlobal('fetch', fetch)

		const time = String(Date.now())

		sessionStorage.setItem('docs:stale-reload', time)

		failModuleLoad().dispatchEvent(new Event('error'))

		// A script with another key would write the time of a reload there.
		expect(sessionStorage.length).toBe(1)

		expect(sessionStorage.getItem('docs:stale-reload')).toBe(time)

		expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/assets/entry.client-gone.js'), {
			cache: 'reload',
		})

		expect(window.__staleBuild).toBeUndefined()
	})

	it('does nothing after the client entry ends the watch', () => {
		const fetch = vi.fn(() => Promise.resolve(new Response()))

		vi.stubGlobal('fetch', fetch)

		const script = failModuleLoad()

		endStaleBuildWatch()

		script.dispatchEvent(new Event('error'))

		expect(fetch).not.toHaveBeenCalled()

		expect(sessionStorage.getItem('docs:stale-reload')).toBeNull()
	})
})
