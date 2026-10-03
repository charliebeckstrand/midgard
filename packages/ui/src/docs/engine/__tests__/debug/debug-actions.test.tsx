import { act, Suspense } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { DebugActions } from '../../debug/debug-actions'
import { loadDebugTool, preloadDebugTools } from '../../debug/registry'
import { DEBUG_ATTRIBUTE, setDebugTool } from '../../debug/store'
import { renderUI, screen } from '../helpers'

afterEach(() => {
	// The test can end with the tree still mounted, so the store change renders.
	act(() => setDebugTool('event-log', false))
})

describe('DebugActions', () => {
	it('renders the button of each tool, also while the tool is off', () => {
		renderUI(<DebugActions />)

		const button = screen.getByRole('button', { name: 'Event log', hidden: true })

		// CSS shows the button only while the root element lists the tool.
		expect(button.parentElement?.className).toContain('hidden')

		expect(button.parentElement?.className).toContain('[:root[data-debug~=event-log]_&]:contents')
	})

	it('lists the tools that are on in the attribute of the root element', () => {
		setDebugTool('event-log', true)

		expect(document.documentElement.getAttribute(DEBUG_ATTRIBUTE)).toBe('event-log')

		setDebugTool('event-log', false)

		expect(document.documentElement.hasAttribute(DEBUG_ATTRIBUTE)).toBe(false)
	})

	it('opens the sheet of a tool that is on from its button', async () => {
		setDebugTool('event-log', true)

		await preloadDebugTools()

		renderUI(
			<Suspense fallback={null}>
				<DebugActions />
			</Suspense>,
		)

		await act(async () => screen.getByRole('button', { name: 'Event log', hidden: true }).click())

		expect(await screen.findByRole('dialog')).toBeDefined()
	})

	it('gives null for a tool that is not in the registry', async () => {
		await expect(loadDebugTool('none')).resolves.toBeNull()
	})
})
