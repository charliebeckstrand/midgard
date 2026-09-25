import { afterEach, describe, expect, it } from 'vitest'
import {
	AppearanceProvider,
	AppearanceScript,
	AppearanceSettings,
	useAppearance,
} from '../../providers/appearance'
import { act, bySlot, renderUI, screen, userEvent } from '../helpers'

function Probe() {
	const { theme, density, setTheme, setDensity } = useAppearance()

	return (
		<>
			<output data-testid="state">{`${theme} ${density}`}</output>
			<button type="button" onClick={() => setTheme('dark')}>
				Dark
			</button>
			<button type="button" onClick={() => setDensity('compact')}>
				Compact
			</button>
		</>
	)
}

afterEach(() => {
	localStorage.clear()

	document.documentElement.classList.remove('dark')
})

describe('AppearanceProvider', () => {
	it('defaults to the system theme and the snug density', () => {
		renderUI(
			<AppearanceProvider>
				<Probe />
			</AppearanceProvider>,
		)

		expect(screen.getByTestId('state')).toHaveTextContent('system snug')
	})

	it('reads the stored choices and ignores an unknown value', () => {
		localStorage.setItem('theme', 'dark')

		localStorage.setItem('density', 'huge')

		renderUI(
			<AppearanceProvider>
				<Probe />
			</AppearanceProvider>,
		)

		expect(screen.getByTestId('state')).toHaveTextContent('dark snug')

		expect(document.documentElement).toHaveClass('dark')
	})

	it('applies and stores a new choice', async () => {
		const { container } = renderUI(
			<AppearanceProvider>
				<Probe />
			</AppearanceProvider>,
		)

		await userEvent.click(screen.getByRole('button', { name: 'Dark' }))

		await userEvent.click(screen.getByRole('button', { name: 'Compact' }))

		expect(screen.getByTestId('state')).toHaveTextContent('dark compact')

		expect(document.documentElement).toHaveClass('dark')

		expect(localStorage.getItem('theme')).toBe('dark')

		expect(localStorage.getItem('density')).toBe('compact')

		expect(bySlot(container, 'density')).toHaveAttribute('data-density', 'compact')
	})

	it('follows a change from another tab', () => {
		renderUI(
			<AppearanceProvider>
				<Probe />
			</AppearanceProvider>,
		)

		act(() => {
			localStorage.setItem('theme', 'light')

			window.dispatchEvent(new StorageEvent('storage', { key: 'theme' }))
		})

		expect(screen.getByTestId('state')).toHaveTextContent('light snug')

		expect(document.documentElement).not.toHaveClass('dark')
	})

	it('throws when useAppearance has no provider', () => {
		expect(() => renderUI(<Probe />)).toThrow(
			'useAppearance must be used within <AppearanceProvider>',
		)
	})
})

describe('AppearanceSettings', () => {
	it('opens the settings dialog from its icon button', async () => {
		renderUI(
			<AppearanceProvider>
				<AppearanceSettings />
			</AppearanceProvider>,
		)

		await userEvent.click(screen.getByRole('button', { name: 'Settings' }))

		expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument()
	})
})

describe('AppearanceScript', () => {
	it('renders an inline script that reads the stored theme', () => {
		const { container } = renderUI(<AppearanceScript />)

		expect(container.querySelector('script')?.textContent).toContain(
			'localStorage.getItem("theme")',
		)
	})
})
