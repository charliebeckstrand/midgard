import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { Link } from '../../components/link'
import { UIProvider, useLink } from '../../providers/ui'
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

	it('exposes a data-slot anchor', () => {
		renderUI(<Link href="/a">Anchor</Link>)

		expect(screen.getByText('Anchor')).toHaveAttribute('data-slot', 'link')
	})

	it('omits the underline class by default', () => {
		renderUI(<Link href="/u">NoUnderline</Link>)

		expect(screen.getByText('NoUnderline').className ?? '').not.toContain('hover:underline')
	})

	it('applies the underline class when underline', () => {
		renderUI(
			<Link href="/u" underline>
				Underline
			</Link>,
		)

		expect(screen.getByText('Underline').className).toContain('hover:underline')
	})

	it('renders custom component registered through UIProvider', () => {
		function CustomLink({ href, children, ...props }: { href: string; children?: ReactNode }) {
			return (
				<span data-href={href} {...props}>
					{children}
				</span>
			)
		}

		renderUI(
			<UIProvider link={CustomLink}>
				<Link href="/custom">Custom</Link>
			</UIProvider>,
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
