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

	it('defaults a safe rel when opening a new tab', () => {
		renderUI(
			<Link href="/x" target="_blank">
				New tab
			</Link>,
		)

		expect(screen.getByText('New tab')).toHaveAttribute('rel', 'noopener noreferrer')
	})

	it('respects an explicit rel over the new-tab default', () => {
		renderUI(
			<Link href="/x" target="_blank" rel="external">
				Explicit
			</Link>,
		)

		expect(screen.getByText('Explicit')).toHaveAttribute('rel', 'external')
	})

	it('leaves rel unset for same-tab links', () => {
		renderUI(<Link href="/y">Same tab</Link>)

		expect(screen.getByText('Same tab')).not.toHaveAttribute('rel')
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
