import type { ComponentType } from 'react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeAll, expect, test, vi } from 'vitest'
import { page } from 'vitest/browser'
import '../../docs/app.css'
import { App } from '../../docs/engine/app'
import { navigate } from '../../docs/engine/hooks/use-hash'
import { demos, initRegistry } from '../../docs/engine/registry'

/**
 * The visual suite: one screenshot of each demo page of the docs site, compared
 * with the reference image in `__screenshots__/`. `vitest.visual.config.ts`
 * gives the reasons for the setup, and CI does not run it.
 */

/** The width of the page. The docs site shows its fixed sidebar at this width. */
const WIDTH = 1280

/** The height of the page before the case fits the page to the demo. */
const HEIGHT = 800

// The globs of `src/docs/main.tsx`, from this folder. The registry makes the id
// of a demo from a path under `./demos/`, so each key gets that prefix again.
const loaders = Object.fromEntries(
	Object.entries(
		import.meta.glob<ComponentType>(
			[
				'../../docs/demos/components/*.tsx',
				'../../docs/demos/providers/*.tsx',
				'../../docs/demos/modules/*.tsx',
				'../../docs/demos/modules/*/index.tsx',
				'../../docs/demos/structure/*.tsx',
			],
			{ import: 'Demo' },
		),
	).map(([path, load]) => [path.replace('../../docs/', './'), load]),
)

// A demo that shows a date, a relative time, or the current month reads the
// clock. A fixed clock keeps its screenshot the same from run to run. Only
// `Date` is fake, so the timers of the page run as usual.
vi.setSystemTime(new Date('2026-01-15T12:00:00Z'))

initRegistry(loaders)

beforeAll(() => {
	const root = document.createElement('div')

	document.body.append(root)

	createRoot(root).render(
		<StrictMode>
			<App />
		</StrictMode>,
	)
})

test.for(demos.map((demo) => [demo.id, demo.name] as const))('%s', async ([id, name]) => {
	await page.viewport(WIDTH, HEIGHT)

	navigate(id)

	// The app keeps the previous demo on the page while the chunk of the next
	// demo loads. The heading changes when the next demo renders.
	await expect
		.poll(
			() => document.querySelector('header[data-slot=header] [data-slot=heading]')?.textContent,
			{
				timeout: 10_000,
			},
		)
		.toBe(name)

	const content = document.querySelector<HTMLElement>(
		'header[data-slot=header] + [data-slot=stack]',
	)

	const pane = content?.parentElement?.parentElement

	if (!content || !pane) throw new Error(`visual: the page of ${id} has no demo content`)

	// At this width the content pane scrolls, and a screenshot of an element
	// shows only the part in the pane. A page as tall as the content shows all of it.
	await page.viewport(WIDTH, HEIGHT + pane.scrollHeight - pane.clientHeight)

	await document.fonts.ready

	await expect.element(page.elementLocator(content)).toMatchScreenshot(id)
})
