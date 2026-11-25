import { describe, expect, it, vi } from 'vitest'
import { Wysiwyg } from '../../modules/wysiwyg'
import { __resetWysiwygEngine } from '../../modules/wysiwyg/use-wysiwyg-editor'
import { fireEvent, renderUI, screen, waitFor } from '../helpers'

/**
 * The first focus of a Wysiwyg starts the load of its editor in the focus
 * event, and not in an effect of a render that the focus causes.
 *
 * Before the load, the page is busy, which is why the idle load has not
 * started. An effect then runs late: in the docs app at a 4x CPU slowdown, the
 * request of the editor started about 420 ms after the press. A load that
 * starts in the event overlaps that work.
 *
 * A load that fails reports one rejection for each press, though the press
 * and its focus both start the load.
 *
 * The suite spies on each `load` of a lazy module, so the check needs a module
 * mock, and the suite sits in `boundary/`.
 */
const spies = vi.hoisted(() => ({
	load: vi.fn(),
	// A promise that each `load` gives in place of the real load, when set.
	override: null as Promise<unknown> | null,
}))

const { load } = spies

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

					return (spies.override as Promise<M> | null) ?? lazy.load()
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

	it('reports a load once for a press and its focus', () => {
		__resetWysiwygEngine()

		// A load in flight. The field reports a failure through a handler on it.
		const pending = new Promise<unknown>(() => undefined)

		const report = vi.spyOn(pending, 'catch')

		spies.override = pending

		try {
			renderUI(<Wysiwyg aria-label="Notes" defaultValue="**Launch**" />)

			const field = screen.getByRole('textbox')

			load.mockClear()

			fireEvent.pointerDown(field)

			field.focus()

			expect(load).toHaveBeenCalledTimes(2)

			expect(report).toHaveBeenCalledTimes(1)
		} finally {
			spies.override = null
		}
	})
})
