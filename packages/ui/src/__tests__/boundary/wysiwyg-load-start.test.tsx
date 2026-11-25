import { describe, expect, it, vi } from 'vitest'
import { Wysiwyg } from '../../modules/wysiwyg'
import { __resetWysiwygEngine } from '../../modules/wysiwyg/use-wysiwyg-editor'
import { renderUI, screen, waitFor } from '../helpers'

/**
 * The first focus of a Wysiwyg starts the load of its editor in the focus
 * event, and not in an effect of a render that the focus causes.
 *
 * Before the load, the page is busy, which is why the idle load has not
 * started. An effect then runs late: in the docs app at a 4x CPU slowdown, the
 * request of the editor started about 420 ms after the press. A load that
 * starts in the event overlaps that work.
 *
 * The suite spies on each `load` of a lazy module, so the check needs a module
 * mock, and the suite sits in `boundary/`.
 */
const { load } = vi.hoisted(() => ({ load: vi.fn() }))

vi.mock('../../utilities/lazy-module', async (importActual) => {
	const actual = await importActual<typeof import('../../utilities/lazy-module')>()

	return {
		...actual,
		createLazyModule: <M,>(importer: () => Promise<M>) => {
			const lazy = actual.createLazyModule(importer)

			return {
				...lazy,
				load: () => {
					load()

					return lazy.load()
				},
			}
		},
	}
})

describe('Wysiwyg load start', () => {
	it('starts the load of the editor in the first focus', async () => {
		__resetWysiwygEngine()

		renderUI(<Wysiwyg aria-label="Notes" defaultValue="**Launch**" />)

		load.mockClear()

		// A focus outside `act`, so React runs no render or effect before the check.
		screen.getByRole('textbox').focus()

		expect(load).toHaveBeenCalled()

		await waitFor(() =>
			expect(screen.getByRole('textbox')).toHaveAttribute('contenteditable', 'true'),
		)
	})
})
