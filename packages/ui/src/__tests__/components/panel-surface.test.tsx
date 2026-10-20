import type { ComponentType, ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Dialog, DialogPanel } from '../../components/dialog'
import { Drawer, DrawerPanel } from '../../components/drawer'
import { Sheet, SheetPanel } from '../../components/sheet'
import { fireEvent, renderUI, screen } from '../helpers'

type Family = {
	name: string
	Root: ComponentType<{ open: boolean; onOpenChange: (open: boolean) => void; children: ReactNode }>
	Panel: ComponentType<{
		'aria-label'?: string
		glass?: boolean
		modal?: boolean
		footer?: ReactNode
		children: ReactNode
	}>
}

const FAMILIES: Family[] = [
	{ name: 'dialog', Root: Dialog, Panel: DialogPanel },
	{ name: 'drawer', Root: Drawer, Panel: DrawerPanel },
	{ name: 'sheet', Root: Sheet, Panel: SheetPanel },
]

/**
 * The three panels share one surface wiring (`usePanelSurface`), so each one
 * follows the same rules for modality, the glass cascade, and clicks.
 */
describe.each(FAMILIES)('$name panel surface', ({ Root, Panel }) => {
	function panel(props: { glass?: boolean; modal?: boolean } = {}) {
		renderUI(
			<Root open onOpenChange={() => {}}>
				<Panel aria-label="Panel" {...props}>
					Body
				</Panel>
			</Root>,
		)

		return screen.getByRole('dialog', { name: 'Panel' })
	}

	it('is modal unless the consumer sets false', () => {
		expect(panel()).toHaveAttribute('aria-modal', 'true')
	})

	it('turns its own pointer events on when it is not modal', () => {
		const surface = panel({ modal: false })

		expect(surface).not.toHaveAttribute('aria-modal')

		expect(surface.className).toContain('pointer-events-auto')
	})

	it('opens the glass cascade to its contents when it is glass', () => {
		const surface = panel({ glass: true })

		expect(surface.className).toContain('group/glass')

		expect(surface).toHaveAttribute('data-glass', '')
	})

	it('keeps the glass cascade closed when it is flat', () => {
		const surface = panel()

		expect(surface.className).not.toContain('group/glass')

		expect(surface).not.toHaveAttribute('data-glass')
	})

	it('stops a click at the panel', () => {
		const onAncestorClick = vi.fn()

		renderUI(
			// The panel portals out of the button, but React carries a click up the
			// component tree.
			<button type="button" onClick={onAncestorClick}>
				<Root open onOpenChange={() => {}}>
					<Panel aria-label="Panel" footer={null}>
						Body
					</Panel>
				</Root>
			</button>,
		)

		fireEvent.click(screen.getByRole('dialog', { name: 'Panel' }))

		expect(onAncestorClick).not.toHaveBeenCalled()
	})
})
