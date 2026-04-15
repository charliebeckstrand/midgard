import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Link, LinkProvider, useLink } from '../../core/link-context'
import { renderUI, screen } from '../helpers'

describe('Link', () => {
	it('renders an anchor by default', () => {
		renderUI(<Link href="/home">Home</Link>)

		const link = screen.getByText('Home')

		expect(link.tagName).toBe('A')
	})

	it('renders with href attribute', () => {
		renderUI(<Link href="/about">About</Link>)

		const link = screen.getByText('About')

		expect(link).toHaveAttribute('href', '/about')
	})

	it('renders custom component from LinkProvider', () => {
		function CustomLink({
			href,
			children,
			...props
		}: {
			href: string
			children?: React.ReactNode
		}) {
			return (
				<span data-href={href} {...props}>
					{children}
				</span>
			)
		}

		renderUI(
			<LinkProvider component={CustomLink}>
				<Link href="/custom">Custom</Link>
			</LinkProvider>,
		)

		const el = screen.getByText('Custom')

		expect(el.tagName).toBe('SPAN')
		expect(el).toHaveAttribute('data-href', '/custom')
	})
})

describe('useLink', () => {
	it('returns default a component without provider', () => {
		const { result } = renderHook(() => useLink())

		expect(result.current.component).toBe('a')
	})
})
