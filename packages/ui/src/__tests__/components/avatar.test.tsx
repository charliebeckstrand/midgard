import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Avatar, AvatarGroup, AvatarSkeleton } from '../../components/avatar'
import { allBySlot, bySlot, getSlot, renderUI, screen } from '../helpers'

describe('Avatar', () => {
	// An avatar can sit in a line of text, so its skeleton has to be able to as well.
	it('stands in for an avatar inside a paragraph, as server markup and inline', () => {
		const container = document.createElement('div')

		container.innerHTML = renderToString(
			<p>
				Assigned to <AvatarSkeleton size="sm" />
			</p>,
		)

		const skeleton = getSlot(container, 'placeholder')

		expect(skeleton.tagName).toBe('SPAN')
		expect(skeleton.parentElement?.tagName).toBe('P')
		expect(skeleton).toHaveClass('inline-block')
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

		expect(screen.getByRole('img', { name: 'User' })).toBeInTheDocument()
	})

	it('wraps the avatar with a status dot when status is provided', () => {
		const { container } = renderUI(<Avatar initials="AB" status="active" />)

		expect(bySlot(container, 'avatar-with-status')).toBeInTheDocument()

		expect(bySlot(container, 'avatar')).toBeInTheDocument()
	})

	it('fits the status wrapper to the circle, so a stretching parent cannot widen it', () => {
		const { container } = renderUI(<Avatar initials="AB" status="active" />)

		expect(bySlot(container, 'avatar-with-status')).toHaveClass('size-fit')
	})

	it('omits the status wrapper when no status is provided', () => {
		const { container } = renderUI(<Avatar initials="AB" />)

		expect(bySlot(container, 'avatar-with-status')).toBeNull()

		expect(bySlot(container, 'avatar')).toBeInTheDocument()
	})

	it('names the avatar once, and keeps the image and the initials out of the tree', () => {
		const { container } = renderUI(<Avatar src="/avatar.png" initials="JD" alt="User" />)

		// One inner node carries the name; the svg is decorative.
		expect(screen.getAllByRole('img')).toHaveLength(1)

		expect(screen.getByRole('img', { name: 'User' })).toBeInTheDocument()

		expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')

		expect(container.querySelector('svg')).not.toHaveAttribute('aria-label')

		// An image with an empty alt that fails to load draws no alt text over the
		// initials.
		expect(container.querySelector('img')).toHaveAttribute('alt', '')
	})

	it('names an avatar with alt but no src and no initials', () => {
		const { container } = renderUI(<Avatar alt="Ada Lovelace" />)

		const img = screen.getByRole('img', { name: 'Ada Lovelace' })

		// The name sits on an inner node; the root stays a plain span.
		expect(bySlot(container, 'avatar')).toContainElement(img)

		expect(bySlot(container, 'avatar')).not.toHaveAttribute('role')
	})

	it('hides the empty avatar node when alt is empty', () => {
		renderUI(<Avatar />)

		expect(screen.queryByRole('img')).toBeNull()
	})

	it('keeps an image and its initials out of the tree when alt is empty', () => {
		renderUI(<Avatar src="/avatar.png" initials="JD" />)

		expect(screen.queryByRole('img')).toBeNull()
	})

	it('keeps its anchors against a consumer data-slot', () => {
		// `data-slot` types through as any other `data-*` attribute.
		const { container } = renderUI(
			<>
				<Avatar initials="A" data-slot="mine" />
				<Avatar initials="B" status="active" data-slot="mine" />
			</>,
		)

		// The ring of AvatarGroup and the size in a SidebarItem select these anchors.
		expect(allBySlot(container, 'avatar')).toHaveLength(2)

		expect(bySlot(container, 'avatar-with-status')).toBeInTheDocument()

		expect(bySlot(container, 'mine')).toBeNull()
	})

	it('takes no children, because it renders its own content', () => {
		const { container } = renderUI(
			// @ts-expect-error: the avatar renders its own content
			<Avatar initials="A">Child</Avatar>,
		)

		expect(container).not.toHaveTextContent('Child')
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
	it('renders a composed overflow count avatar with an accessible count label', () => {
		const { container } = renderUI(
			<AvatarGroup>
				<Avatar initials="A" />
				<Avatar initials="+3" alt="3 more" />
			</AvatarGroup>,
		)

		// Original + overflow avatar
		expect(allBySlot(container, 'avatar')).toHaveLength(2)

		expect(container.textContent).toContain('+3')

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

	it('spreads native attributes onto the group, so a caller can name it', () => {
		renderUI(
			<AvatarGroup role="group" aria-label="Assignees" id="assignees">
				<Avatar initials="A" alt="Ada" />
				<Avatar initials="B" alt="Bo" />
			</AvatarGroup>,
		)

		const group = screen.getByRole('group', { name: 'Assignees' })

		expect(group).toHaveAttribute('id', 'assignees')

		expect(group).toHaveAttribute('data-slot', 'avatar-group')
	})

	it.each(['sm', 'md', 'lg'] as const)('writes the %s size as the scope of its avatars', (size) => {
		const { container } = renderUI(
			<AvatarGroup size={size}>
				<Avatar initials="A" status="active" />
			</AvatarGroup>,
		)

		expect(bySlot(container, 'avatar-group')).toHaveAttribute('data-density', size)

		// The child and its dot write no scope, so both take the step of the group.
		expect(bySlot(container, 'avatar-with-status')).not.toHaveAttribute('data-density')

		expect(bySlot(container, 'status-dot')).not.toHaveAttribute('data-density')
	})
})
