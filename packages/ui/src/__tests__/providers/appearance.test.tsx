import { cleanup } from '@testing-library/react'
import { MotionConfigContext } from 'motion/react'
import { use } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { readRootDensity, writeRootDensity } from '../../core/density'
import { usePrefersReducedMotion } from '../../hooks/use-prefers-reduced-motion'
import { SidebarLayout } from '../../layouts/sidebar/sidebar'
import { useDensityStep } from '../../primitives/density'
import { ReducedMotion } from '../../primitives/reduced-motion'
import {
	AppearanceProvider,
	AppearanceScript,
	AppearanceSettings,
	useAppearance,
} from '../../providers/appearance'
import {
	act,
	bySlot,
	fireEvent,
	present,
	renderUI,
	screen,
	stubMatchMedia,
	userEvent,
	waitFor,
} from '../helpers'

function Probe() {
	const { theme, density, motion, setTheme, setDensity, setMotion } = useAppearance()

	return (
		<>
			<output data-testid="state">{`${theme} ${density} ${motion}`}</output>
			<button type="button" onClick={() => setTheme('dark')}>
				Dark
			</button>
			<button type="button" onClick={() => setDensity('compact')}>
				Compact
			</button>
			<button type="button" onClick={() => setMotion('reduced')}>
				Reduced
			</button>
		</>
	)
}

// Shows the JS readers of reduced motion: the hook, and the Motion config.
function MotionProbe() {
	const reduced = usePrefersReducedMotion()

	const config = use(MotionConfigContext)

	return <output data-testid="motion">{`${reduced} ${config.reducedMotion}`}</output>
}

// A mounted density reader re-renders when the root step changes, outside
// `act()`. Unmount it before the step is removed.
afterEach(() => {
	cleanup()

	localStorage.clear()

	document.documentElement.classList.remove('dark', 'reduced-motion', 'sidebar-offcanvas')

	writeRootDensity(document.documentElement, 'md')
})

describe('AppearanceProvider', () => {
	it('defaults to the system theme, the snug density, and the system motion', () => {
		renderUI(
			<AppearanceProvider>
				<Probe />
			</AppearanceProvider>,
		)

		expect(screen.getByTestId('state')).toHaveTextContent('system snug system')
	})

	it('reads the stored choices and ignores an unknown value', () => {
		localStorage.setItem('theme', 'dark')

		localStorage.setItem('density', 'huge')

		renderUI(
			<AppearanceProvider>
				<Probe />
			</AppearanceProvider>,
		)

		expect(screen.getByTestId('state')).toHaveTextContent('dark snug system')

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

		await userEvent.click(screen.getByRole('button', { name: 'Reduced' }))

		expect(screen.getByTestId('state')).toHaveTextContent('dark compact reduced')

		expect(document.documentElement).toHaveClass('dark', 'reduced-motion')

		expect(localStorage.getItem('theme')).toBe('dark')

		expect(localStorage.getItem('density')).toBe('compact')

		expect(localStorage.getItem('motion')).toBe('reduced')

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

		expect(screen.getByTestId('state')).toHaveTextContent('light snug system')

		expect(document.documentElement).not.toHaveClass('dark')
	})

	it('marks the root and reduces motion for the JS readers under the reduced motion', () => {
		localStorage.setItem('motion', 'reduced')

		// The platform asks for no reduction, so only the setting can reduce.
		stubMatchMedia(() => false)

		renderUI(
			<AppearanceProvider>
				<ReducedMotion>
					<MotionProbe />
				</ReducedMotion>
			</AppearanceProvider>,
		)

		expect(document.documentElement).toHaveClass('reduced-motion')

		expect(screen.getByTestId('motion')).toHaveTextContent('true always')
	})

	it('leaves the platform to decide under the system motion', () => {
		stubMatchMedia(() => false)

		renderUI(
			<AppearanceProvider>
				<ReducedMotion>
					<MotionProbe />
				</ReducedMotion>
			</AppearanceProvider>,
		)

		expect(document.documentElement).not.toHaveClass('reduced-motion')

		expect(screen.getByTestId('motion')).toHaveTextContent('false user')
	})

	it('marks the root while the sidebar is offcanvas', async () => {
		function SidebarProbe() {
			const { sidebar, setSidebar } = useAppearance()

			return (
				<button
					type="button"
					onClick={() => setSidebar(sidebar === 'locked' ? 'offcanvas' : 'locked')}
				>
					{sidebar}
				</button>
			)
		}

		renderUI(
			<AppearanceProvider>
				<SidebarProbe />
			</AppearanceProvider>,
		)

		const button = screen.getByRole('button', { name: 'locked' })

		expect(document.documentElement).not.toHaveClass('sidebar-offcanvas')

		await userEvent.click(button)

		expect(button).toHaveTextContent('offcanvas')

		expect(document.documentElement).toHaveClass('sidebar-offcanvas')

		expect(localStorage.getItem('sidebar')).toBe('offcanvas')

		await userEvent.click(button)

		expect(document.documentElement).not.toHaveClass('sidebar-offcanvas')
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

		expect(await screen.findByRole('dialog', { name: 'Settings' })).toBeInTheDocument()
	})

	it('shows the density level name without its step', async () => {
		renderUI(
			<AppearanceProvider>
				<AppearanceSettings />
			</AppearanceProvider>,
		)

		await userEvent.click(screen.getByRole('button', { name: 'Settings' }))

		const dialog = await screen.findByRole('dialog', { name: 'Settings' })

		expect(dialog).toHaveTextContent('Snug')
		expect(dialog).not.toHaveTextContent('(md)')
	})

	it('shows the motion picker at the system motion', async () => {
		renderUI(
			<AppearanceProvider>
				<AppearanceSettings />
			</AppearanceProvider>,
		)

		await userEvent.click(screen.getByRole('button', { name: 'Settings' }))

		const dialog = await screen.findByRole('dialog', { name: 'Settings' })

		expect(dialog).toHaveTextContent('Motion')
		expect(dialog).toHaveTextContent('System')
	})

	it('shows no sidebar picker outside a sidebar layout', async () => {
		renderUI(
			<AppearanceProvider>
				<AppearanceSettings />
			</AppearanceProvider>,
		)

		await userEvent.click(screen.getByRole('button', { name: 'Settings' }))

		expect(await screen.findByRole('dialog', { name: 'Settings' })).not.toHaveTextContent('Sidebar')
	})

	it('picks the sidebar mode inside a sidebar layout, and shows its key', async () => {
		renderUI(
			<AppearanceProvider>
				<SidebarLayout sidebar={<div>side</div>} actions={<AppearanceSettings />}>
					body
				</SidebarLayout>
			</AppearanceProvider>,
		)

		// The navbar and the header both hold the actions. The first button opens the dialog.
		await userEvent.click(screen.getAllByRole('button', { name: 'Settings' })[0] as HTMLElement)

		const dialog = await screen.findByRole('dialog', { name: 'Settings' })

		expect(dialog).toHaveTextContent('Sidebar')

		expect(dialog).toHaveTextContent('Locked')

		// The key sits before the chevron, and a mousedown on either keeps the focus.
		const suffix = present(dialog.querySelector('kbd')?.parentElement, 'sidebar suffix')

		expect(suffix.firstElementChild).toHaveTextContent('Ctrl+B')

		expect(suffix.lastElementChild?.tagName.toLowerCase()).toBe('svg')

		expect(fireEvent.mouseDown(suffix)).toBe(false)

		await userEvent.click(screen.getByRole('combobox', { name: 'Sidebar' }))

		await userEvent.click(screen.getByRole('option', { name: 'Offcanvas' }))

		expect(localStorage.getItem('sidebar')).toBe('offcanvas')

		expect(document.documentElement).toHaveClass('sidebar-offcanvas')
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

	it('marks the root for the stored reduced motion only', () => {
		localStorage.setItem('motion', 'system')

		runScript()

		expect(document.documentElement).not.toHaveClass('reduced-motion')

		localStorage.setItem('motion', 'reduced')

		runScript()

		expect(document.documentElement).toHaveClass('reduced-motion')
	})

	it('marks the root for the stored offcanvas sidebar only', () => {
		localStorage.setItem('sidebar', 'locked')

		runScript()

		expect(document.documentElement).not.toHaveClass('sidebar-offcanvas')

		localStorage.setItem('sidebar', 'offcanvas')

		runScript()

		expect(document.documentElement).toHaveClass('sidebar-offcanvas')
	})
})
