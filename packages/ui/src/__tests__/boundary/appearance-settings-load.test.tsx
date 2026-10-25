import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AppearanceProvider, AppearanceSettings } from '../../providers/appearance'
import { FailBoundary } from '../helpers/fail-boundary.tsx'

// The dialog of AppearanceSettings is in a chunk of its own. When the load that
// a press asks for fails, the press gives the failure to the nearest error
// boundary. Without it, the button does nothing, and nothing tells the reader.
//
// The mock of the dialog module makes its load fail. The `unit` project bars
// a mock of its own in a file (see `test-isolation-boundary.test.ts`), so this
// suite sits in `boundary/`, which the `integration` project runs on forks.

vi.mock('../../providers/appearance/appearance-settings-dialog', () => {
	throw new Error('the chunk of the dialog did not load')
})

describe('a failed load of the appearance settings dialog', () => {
	it('gives the failure to the error boundary when the reader presses the button', async () => {
		// React writes the caught error to the console.
		vi.spyOn(console, 'error').mockImplementation(() => {})

		render(
			<FailBoundary>
				<AppearanceProvider>
					<AppearanceSettings />
				</AppearanceProvider>
			</FailBoundary>,
		)

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
		})

		expect(await screen.findByText('Failed')).toBeTruthy()
	})
})
