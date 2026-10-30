import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
	AuthLayout,
	DashboardLayout,
	SidebarLayout,
	SidebarLayoutBody,
	StackedLayout,
	StackedLayoutBody,
} from '../../layouts'
import { Landmark, useLandmark } from '../../primitives/landmark'
import { allBySlot, renderUI, screen } from '../helpers'

/** The tag names of the elements with `slot`, in document order. */
function readTagNames(container: HTMLElement, slot: string): string[] {
	return allBySlot(container, slot).map((element) => element.tagName.toLowerCase())
}

describe('Landmark', () => {
	it('is a main element at the top level, and a div in another layout', () => {
		const { container } = renderUI(
			<SidebarLayout sidebar={null}>
				<SidebarLayoutBody>
					<SidebarLayout sidebar={null}>
						<SidebarLayoutBody>Preview</SidebarLayoutBody>
					</SidebarLayout>
					<StackedLayout>
						<StackedLayoutBody>Preview</StackedLayoutBody>
					</StackedLayout>
				</SidebarLayoutBody>
			</SidebarLayout>,
		)

		expect(readTagNames(container, 'body')).toEqual(['main', 'div', 'div'])
	})

	it('is a div for the auth and the dashboard layouts in another layout', () => {
		const { container } = renderUI(
			<StackedLayout>
				<StackedLayoutBody>
					<AuthLayout>Sign in</AuthLayout>
					<DashboardLayout>Orders</DashboardLayout>
				</StackedLayoutBody>
			</StackedLayout>,
		)

		expect(readTagNames(container, 'auth-layout')).toEqual(['div'])

		expect(readTagNames(container, 'main')).toEqual(['div'])

		expect(container.querySelectorAll('main')).toHaveLength(1)
	})

	it('gives the ref the element that it renders', () => {
		let element: HTMLElement | null = null

		renderUI(
			<SidebarLayout sidebar={null}>
				<SidebarLayoutBody>
					<SidebarLayout sidebar={null}>
						<SidebarLayoutBody
							ref={(node) => {
								element = node
							}}
						>
							Preview
						</SidebarLayoutBody>
					</SidebarLayout>
				</SidebarLayoutBody>
			</SidebarLayout>,
		)

		expect(element).toBeInstanceOf(HTMLDivElement)
	})

	it('tells a descendant which landmark holds it', () => {
		expect(renderHook(useLandmark).result.current).toBeNull()

		const { result } = renderHook(useLandmark, {
			wrapper: ({ children }) => <Landmark as="main">{children}</Landmark>,
		})

		expect(result.current).toBe('main')
	})

	it('is a region at the top level, and a section with no name in a main', () => {
		renderUI(
			<>
				<Landmark as="section" aria-label="Outer" />
				<Landmark as="main">
					<Landmark as="section" aria-label="Inner" />
				</Landmark>
			</>,
		)

		expect(
			screen.getAllByRole('region').map((region) => region.getAttribute('aria-label')),
		).toEqual(['Outer'])
	})

	it('drops the navbar region of a layout in another layout', () => {
		renderUI(
			<SidebarLayout sidebar={null}>
				<SidebarLayoutBody>
					<SidebarLayout sidebar={null}>
						<SidebarLayoutBody>Preview</SidebarLayoutBody>
					</SidebarLayout>
				</SidebarLayoutBody>
			</SidebarLayout>,
		)

		expect(screen.getAllByRole('region', { name: 'Navigation bar' })).toHaveLength(1)
	})
})
