import { Suspense } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { DebugActions } from '../../debug/debug-actions'
import { loadDebugTool, preloadDebugTools } from '../../debug/registry'
import { setDebugTool } from '../../debug/store'
import { renderUI, screen } from '../helpers'

afterEach(() => {
	setDebugTool('event-log', false)
})

describe('DebugActions', () => {
	it('paints the part of a preloaded tool in the first commit', async () => {
		setDebugTool('event-log', true)

		await preloadDebugTools()

		renderUI(
			<Suspense fallback={<p>loading</p>}>
				<DebugActions />
			</Suspense>,
		)

		expect(screen.queryByText('loading')).toBeNull()

		expect(screen.getByRole('button', { name: 'Event log' })).toBeDefined()
	})

	it('gives null for a tool that is not in the registry', async () => {
		await expect(loadDebugTool('none')).resolves.toBeNull()
	})
})
