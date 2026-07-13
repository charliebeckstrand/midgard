import { beforeEach, describe, expect, it } from 'vitest'
import { ThemeProvider, ThemeScript, useTheme } from '../../providers/theme'
import { bySlot, renderUI, userEvent } from '../helpers'

/** Reads the context inside the provider and exposes it for assertions. */
function Probe() {
	const { mode, resolvedMode, setMode, theme } = useTheme()

	return (
		<button
			type="button"
			data-slot="theme-probe"
			data-mode={mode}
			data-resolved={resolvedMode}
			data-brand={theme}
			onClick={() => setMode('dark')}
		>
			toggle
		</button>
	)
}

beforeEach(() => {
	localStorage.clear()

	document.documentElement.classList.remove('dark')

	document.documentElement.style.colorScheme = ''

	delete document.documentElement.dataset.theme
})

describe('ThemeProvider', () => {
	it('applies an explicit dark preference to the root element', () => {
		renderUI(
			<ThemeProvider defaultMode="dark">
				<Probe />
			</ThemeProvider>,
		)

		expect(document.documentElement.classList.contains('dark')).toBe(true)

		expect(document.documentElement.style.colorScheme).toBe('dark')
	})

	it('resolves system via matchMedia (stubbed light) and exposes both modes', () => {
		const { container } = renderUI(
			<ThemeProvider>
				<Probe />
			</ThemeProvider>,
		)

		const probe = bySlot(container, 'theme-probe')

		expect(probe).toHaveAttribute('data-mode', 'system')

		expect(probe).toHaveAttribute('data-resolved', 'light')

		expect(document.documentElement.classList.contains('dark')).toBe(false)
	})

	it('setMode applies and persists the new preference', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(
			<ThemeProvider>
				<Probe />
			</ThemeProvider>,
		)

		const probe = bySlot(container, 'theme-probe')

		if (!probe) throw new Error('probe did not render')

		await user.click(probe)

		expect(probe).toHaveAttribute('data-mode', 'dark')

		expect(document.documentElement.classList.contains('dark')).toBe(true)

		expect(localStorage.getItem('theme')).toBe('dark')
	})

	it('reads the stored preference under the configured storage key', () => {
		localStorage.setItem('scheme', 'dark')

		renderUI(
			<ThemeProvider storageKey="scheme">
				<Probe />
			</ThemeProvider>,
		)

		expect(document.documentElement.classList.contains('dark')).toBe(true)
	})

	it('stamps and clears the brand theme as data-theme on the root', () => {
		const { container, unmount } = renderUI(
			<ThemeProvider defaultMode="light" theme="acme">
				<Probe />
			</ThemeProvider>,
		)

		expect(document.documentElement.dataset.theme).toBe('acme')

		expect(bySlot(container, 'theme-probe')).toHaveAttribute('data-brand', 'acme')

		unmount()

		expect(document.documentElement.dataset.theme).toBeUndefined()
	})

	it('useTheme throws outside a provider', () => {
		expect(() => renderUI(<Probe />)).toThrow('useTheme must be used within <Theme>')
	})
})

describe('ThemeScript', () => {
	it('inlines the storage key and default mode into the no-flash script', () => {
		const { container } = renderUI(<ThemeScript storageKey="scheme" defaultMode="dark" />)

		const script = bySlot(container, 'theme-script')

		expect(script?.tagName).toBe('SCRIPT')

		expect(script?.textContent).toContain('"scheme"')

		expect(script?.textContent).toContain('"dark"')
	})
})
