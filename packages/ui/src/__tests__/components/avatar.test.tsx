import { describe, expect, it } from 'vitest'
import { Avatar, AvatarGroup } from '../../components/avatar'
import { allBySlot, bySlot, itRendersSkeletonPlaceholder, renderUI, screen } from '../helpers'

describe('Avatar', () => {
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

	itRendersSkeletonPlaceholder(<Avatar initials="AB" />, 'avatar')

	it('wraps the avatar with a status dot when status is provided', () => {
		const { container } = renderUI(<Avatar initials="AB" status="active" />)

		expect(bySlot(container, 'avatar-with-status')).toBeInTheDocument()

		expect(bySlot(container, 'avatar')).toBeInTheDocument()
	})

	it('omits the status wrapper when no status is provided', () => {
		const { container } = renderUI(<Avatar initials="AB" />)

		expect(bySlot(container, 'avatar-with-status')).toBeNull()

		expect(bySlot(container, 'avatar')).toBeInTheDocument()
	})
})

describe('AvatarGroup', () => {
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

	it('gives the overflow avatar an accessible count label', () => {
		renderUI(
			<AvatarGroup extra={3}>
				<Avatar initials="A" />
			</AvatarGroup>,
		)

		expect(screen.getByRole('img', { name: '3 more' })).toBeInTheDocument()
	})
})
