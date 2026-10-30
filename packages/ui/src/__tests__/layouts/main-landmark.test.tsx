import { describe, expect, it } from 'vitest'
import {
	AuthLayout,
	DashboardLayout,
	SidebarLayout,
	SidebarLayoutBody,
	StackedLayout,
	StackedLayoutBody,
} from '../../layouts'
import { renderUI } from '../helpers'

// A page has one main landmark. A layout in the main slot of another layout,
// such as the preview of an app on a page of docs, renders its main slot as a
// `div`.

/** The tag names of the elements with `slot`, in document order. */
function readTagNames(container: HTMLElement, slot: string): string[] {
	return [...container.querySelectorAll(`[data-slot="${slot}"]`)].map((element) =>
		element.tagName.toLowerCase(),
	)
}

describe('the main slot of a layout', () => {
	it('is a main element at the top level', () => {
		const { container } = renderUI(
			<SidebarLayout sidebar={null}>
				<SidebarLayoutBody>Content</SidebarLayoutBody>
			</SidebarLayout>,
		)

		expect(readTagNames(container, 'body')).toEqual(['main'])
	})

	it('is a div in the main slot of another layout', () => {
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

		expect(container.querySelectorAll('main')).toHaveLength(1)
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
})
