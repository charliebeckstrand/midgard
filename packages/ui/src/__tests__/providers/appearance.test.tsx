import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { readRootDensity, writeRootDensity } from '../../core/density'
import { useDensityStep } from '../../primitives/density'
import {
	AppearanceProvider,
	AppearanceScript,
	AppearanceSettings,
	useAppearance,
} from '../../providers/appearance'
import { act, bySlot, renderUI, screen, stubMatchMedia, userEvent, waitFor } from '../helpers'

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

// A mounted density reader re-renders when the root step changes, outside
// `act()`. Unmount it before the step is removed.
afterEach(() => {
	cleanup()

	localStorage.clear()

	document.documentElement.classList.remove('dark')

	writeRootDensity(document.documentElement, 'md')
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
		renderUI(
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

		expect(readRootDensity(document.documentElement)).toBe('sm')
	})

	it('writes the stored density on the root element and opens no scope of its own', () => {
		localStorage.setItem('density', 'loose')

		const { container } = renderUI(
			<AppearanceProvider>
				<Probe />
			</AppearanceProvider>,
		)

		expect(readRootDensity(document.documentElement)).toBe('lg')

		expect(bySlot(container, 'density')).toBeNull()
	})

	it('gives the root step to a client reader with no scope', async () => {
		localStorage.setItem('density', 'compact')

		function StepProbe() {
			return <output data-testid="step">{useDensityStep()}</output>
		}

		renderUI(
			<AppearanceProvider>
				<StepProbe />
			</AppearanceProvider>,
		)

		// The provider writes the root in an effect, and the reader hears it
		// through a MutationObserver, which reports in a microtask.
		await waitFor(() => expect(screen.getByTestId('step')).toHaveTextContent('sm'))
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

	it('shows the step of the density level after its name', async () => {
		renderUI(
			<AppearanceProvider>
				<AppearanceSettings />
			</AppearanceProvider>,
		)

		await userEvent.click(screen.getByRole('button', { name: 'Settings' }))

		expect(screen.getByRole('dialog', { name: 'Settings' })).toHaveTextContent('Snug (md)')
	})
})

describe('AppearanceScript', () => {
	function runScript() {
		const { container } = renderUI(<AppearanceScript />)

		// Runs the constant script of the component, as the browser does.
		new Function(container.querySelector('script')?.textContent ?? '')()
	}

	it('writes the step of the stored density on the root element', () => {
		localStorage.setItem('density', 'compact')

		runScript()

		expect(readRootDensity(document.documentElement)).toBe('sm')
	})

	it('writes the snug step for a missing or unknown density', () => {
		runScript()

		expect(readRootDensity(document.documentElement)).toBe('md')

		localStorage.setItem('density', '__proto__')

		runScript()

		expect(readRootDensity(document.documentElement)).toBe('md')
	})

	it('applies the stored dark theme', () => {
		localStorage.setItem('theme', 'dark')

		runScript()

		expect(document.documentElement).toHaveClass('dark')
	})

	// The docs page cannot render the component, so it keeps its own copy of the
	// script. This runs both over the same stored values and the same scheme.
	it('matches the pre-paint script of the docs page', () => {
		const page = readFileSync(join(import.meta.dirname, '../../docs/index.html'), 'utf8')

		const docsScript = page.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? ''

		const root = document.documentElement

		const paint = (script: () => void) => {
			root.classList.remove('dark')

			writeRootDensity(root, 'md')

			script()

			return root.className
		}

		const mismatches: string[] = []

		for (const dark of [false, true]) {
			stubMatchMedia(() => dark)

			for (const theme of [null, 'light', 'dark', 'system', 'blue']) {
				for (const density of [null, 'loose', 'snug', 'compact', '__proto__', 'wide']) {
					localStorage.clear()

					if (theme !== null) localStorage.setItem('theme', theme)

					if (density !== null) localStorage.setItem('density', density)

					const docs = paint(() => new Function(docsScript)())

					const component = paint(runScript)

					if (docs !== component) {
						mismatches.push(`${dark} ${theme} ${density}: docs ${docs}, component ${component}`)
					}
				}
			}
		}

		expect(docsScript).not.toBe('')

		expect(mismatches).toEqual([])
	})
})
