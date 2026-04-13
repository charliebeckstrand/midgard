import { describe, expect, it } from 'vitest'
import { Avatar, AvatarGroup } from '../../components/avatar'
import { allBySlot, bySlot, renderUI } from '../helpers'

describe('Avatar', () => {
	it('renders a span with data-slot="avatar"', () => {
		const { container } = renderUI(<Avatar initials="AB" />)
		const avatar = bySlot(container, 'avatar')

		expect(avatar).toBeInTheDocument()
		expect(avatar?.tagName).toBe('SPAN')
	})

	it('renders initials as SVG text', () => {
		const { container } = renderUI(<Avatar initials="JD" />)
		const svg = container.querySelector('svg')
		const text = svg?.querySelector('text')

		expect(svg).toBeInTheDocument()
		expect(text).toHaveTextContent('JD')
	})

	it('renders an image when src is provided', () => {
		const { container } = renderUI(<Avatar src="/avatar.png" alt="User" />)
		const img = container.querySelector('img')

		expect(img).toBeInTheDocument()
		expect(img).toHaveAttribute('src', '/avatar.png')
		expect(img).toHaveAttribute('alt', 'User')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Avatar initials="A" className="ring" />)
		const avatar = bySlot(container, 'avatar')

		expect(avatar?.className).toContain('ring')
	})

	it('renders a placeholder in skeleton mode', () => {
		const { container } = renderUI(<Avatar initials="AB" />, { skeleton: true })

		expect(bySlot(container, 'avatar')).not.toBeInTheDocument()
		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})
})

describe('AvatarGroup', () => {
	it('renders a container with data-slot="avatar-group"', () => {
		const { container } = renderUI(
			<AvatarGroup>
				<Avatar initials="A" />
				<Avatar initials="B" />
			</AvatarGroup>,
		)
		const group = bySlot(container, 'avatar-group')

		expect(group).toBeInTheDocument()
	})

	it('renders an extra count avatar when extra is provided', () => {
		const { container } = renderUI(
			<AvatarGroup extra={3}>
				<Avatar initials="A" />
			</AvatarGroup>,
		)
		const avatars = allBySlot(container, 'avatar')

		// Original + extra avatar
		expect(avatars.length).toBe(2)
		expect(container.textContent).toContain('+3')
	})
})
