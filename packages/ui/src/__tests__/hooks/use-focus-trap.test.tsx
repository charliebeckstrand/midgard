import { render, renderHook } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { useFocusTrap } from '../../hooks/use-focus-trap'

afterEach(() => {
	document.body.innerHTML = ''
})

function TrapHost({
	active,
	html,
	onTrap,
}: {
	active: boolean
	html: string
	onTrap?: (host: HTMLDivElement) => void
}) {
	const ref = useFocusTrap(active)

	useEffect(() => {
		if (ref.current) onTrap?.(ref.current)
	}, [onTrap, ref])

	return (
		<div
			ref={ref}
			data-testid="trap"
			// Inline HTML must be present during the trap's layout effect so the
			// first-focus / [data-autofocus] queries find the children.
			// biome-ignore lint/security/noDangerouslySetInnerHtml: test fixture
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	)
}

describe('useFocusTrap', () => {
	it('returns a ref object', () => {
		const { result } = renderHook(() => useFocusTrap(false))

		expect(result.current).toHaveProperty('current')

		expect(result.current.current).toBeNull()
	})

	it('does nothing when active is false', () => {
		document.body.innerHTML = '<button id="outside">Outside</button>'

		const outside = document.getElementById('outside') as HTMLButtonElement

		outside.focus()

		render(<TrapHost active={false} html="<button>Inside</button>" />)

		expect(document.activeElement).toBe(outside)
	})

	it('focuses an explicit [data-autofocus] element first when active', () => {
		let host: HTMLDivElement | undefined

		render(
			<TrapHost
				active
				html="<button>One</button><button data-autofocus>Two</button><button>Three</button>"
				onTrap={(h) => {
					host = h
				}}
			/>,
		)

		expect(document.activeElement).toBe(host?.querySelector('[data-autofocus]'))
	})

	it('makes the container itself focusable when there are no focusable children', () => {
		let host: HTMLDivElement | undefined

		render(
			<TrapHost
				active
				html="<span>plain</span>"
				onTrap={(h) => {
					host = h
				}}
			/>,
		)

		expect(host?.tabIndex).toBe(-1)

		expect(document.activeElement).toBe(host)
	})

	it('cycles forward on Tab', () => {
		let host: HTMLDivElement | undefined

		render(
			<TrapHost
				active
				html='<button id="a">A</button><button id="b">B</button><button id="c">C</button>'
				onTrap={(h) => {
					host = h
				}}
			/>,
		)

		const c = host?.querySelector<HTMLButtonElement>('#c') as HTMLButtonElement

		c.focus()

		document.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
		)

		expect(document.activeElement).toBe(host?.querySelector('#a'))
	})

	it('cycles backward on Shift+Tab', () => {
		let host: HTMLDivElement | undefined

		render(
			<TrapHost
				active
				html='<button id="a">A</button><button id="b">B</button>'
				onTrap={(h) => {
					host = h
				}}
			/>,
		)

		const a = host?.querySelector<HTMLButtonElement>('#a') as HTMLButtonElement

		a.focus()

		document.dispatchEvent(
			new KeyboardEvent('keydown', {
				key: 'Tab',
				shiftKey: true,
				bubbles: true,
				cancelable: true,
			}),
		)

		expect(document.activeElement).toBe(host?.querySelector('#b'))
	})

	it('ignores non-Tab keys', () => {
		let host: HTMLDivElement | undefined

		render(
			<TrapHost
				active
				html='<button id="a">A</button><button id="b">B</button>'
				onTrap={(h) => {
					host = h
				}}
			/>,
		)

		const a = host?.querySelector<HTMLButtonElement>('#a') as HTMLButtonElement

		a.focus()

		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))

		expect(document.activeElement).toBe(a)
	})

	it('restores focus to the previously focused element on release', () => {
		document.body.innerHTML = '<button id="outside">Outside</button>'

		const outside = document.getElementById('outside') as HTMLButtonElement

		outside.focus()

		const { unmount } = render(<TrapHost active html="<button>Inside</button>" />)

		unmount()

		expect(document.activeElement).toBe(outside)
	})
})
