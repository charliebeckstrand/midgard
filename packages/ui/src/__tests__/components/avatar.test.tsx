import { describe, expect, it } from 'vitest'
import { Avatar, AvatarGroup } from '../../components/avatar'
import { allBySlot, bySlot, renderUI, screen } from '../helpers'

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

	it('hides the initials fallback from assistive tech when an image is present', () => {
		const { container } = renderUI(<Avatar src="/avatar.png" initials="JD" alt="User" />)

		// The image's alt is the single accessible name; the svg is decorative.
		expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')

		expect(container.querySelector('svg')).not.toHaveAttribute('aria-label')

		expect(container.querySelector('img')).toHaveAttribute('alt', 'User')
	})

	it('applies className and spread props to the same element when status is set', () => {
		const { container } = renderUI(
			<Avatar initials="AB" status="active" className="custom" id="me" />,
		)

		const wrapper = bySlot(container, 'avatar-with-status')

		expect(wrapper).toHaveClass('custom')

		expect(wrapper).toHaveAttribute('id', 'me')
	})
})

describe('AvatarGroup', () => {
	it('renders a composed overflow count avatar child', () => {
		const { container } = renderUI(
			<AvatarGroup>
				<Avatar initials="A" />
				<Avatar initials="+3" alt="3 more" />
			</AvatarGroup>,
		)

		const avatars = allBySlot(container, 'avatar')

		// Original + overflow avatar
		expect(avatars.length).toBe(2)

		expect(container.textContent).toContain('+3')
	})

	it('gives a composed overflow avatar an accessible count label', () => {
		renderUI(
			<AvatarGroup>
				<Avatar initials="A" />
				<Avatar initials="+3" alt="3 more" />
			</AvatarGroup>,
		)

		expect(screen.getByRole('img', { name: '3 more' })).toBeInTheDocument()
	})

	it('projects the ring onto the avatar circle, not the status wrapper', () => {
		const { container } = renderUI(
			<AvatarGroup>
				<Avatar initials="A" status="active" />
			</AvatarGroup>,
		)

		const group = bySlot(container, 'avatar-group')

		// A status child's direct node is the square wrapper, so a `*:` ring misses the circle.
		expect(group).toHaveClass('**:data-[slot=avatar]:ring-2')

		expect(group?.className).not.toMatch(/(^|\s)\*:ring-2/)

		expect(
			bySlot(container, 'avatar-with-status')?.querySelector('[data-slot="avatar"]'),
		).not.toBeNull()
	})

	it.each([
		['sm', 'size-2'],
		['md', 'size-2.5'],
		['lg', 'size-3'],
	] as const)('projects the %s size onto a child status dot', (size, dot) => {
		const { container } = renderUI(
			<AvatarGroup size={size}>
				<Avatar initials="A" status="active" />
			</AvatarGroup>,
		)

		// The child passes its own md size to the dot, so the group must override it.
		expect(bySlot(container, 'avatar-group')).toHaveClass(`**:data-[slot=status-dot]:${dot}`)

		expect(bySlot(container, 'status-dot')).toBeInTheDocument()
	})
})
