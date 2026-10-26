import { describe, expect, it, vi } from 'vitest'
import { Button } from '../../components/button'
import { Control } from '../../components/control'
import { Textarea, TextareaSkeleton } from '../../components/textarea'
import { Form } from '../../modules/form'
import { HeadlessProvider } from '../../providers/headless'
import {
	bySlot,
	fireEvent,
	getSlot,
	readDensityStep,
	renderUI,
	screen,
	setupUser,
} from '../helpers'

describe('Textarea', () => {
	it('renders with data-slot="textarea"', () => {
		const { container } = renderUI(<Textarea />)

		const el = bySlot(container, 'textarea')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('TEXTAREA')
	})

	it('fires onChange handler', async () => {
		const onChange = vi.fn()

		const { container } = renderUI(<Textarea onChange={onChange} />)

		const el = getSlot<HTMLTextAreaElement>(container, 'textarea')

		const user = setupUser()

		await user.type(el, 'a')

		expect(onChange).toHaveBeenCalled()
	})

	it('picks up the glass variant from a glass context', () => {
		const { container: plain } = renderUI(<Textarea />)

		const { container: glass } = renderUI(<Textarea />, { glass: true })

		expect(getSlot(glass, 'control-frame').className).not.toBe(
			getSlot(plain, 'control-frame').className,
		)
	})

	it('renders actions below the textarea', () => {
		const { container } = renderUI(<Textarea actions={<span>send</span>} />)

		expect(bySlot(container, 'textarea')).toBeInTheDocument()

		expect(screen.getByText('send')).toBeInTheDocument()
	})

	it('renders the actions row as a span inside the span frame', () => {
		const { container } = renderUI(<Textarea actions={<span>send</span>} />)

		// The ControlFrame is a `<span>`, which takes phrasing content only.
		expect(getSlot(container, 'textarea-actions').tagName).toBe('SPAN')

		expect(getSlot(container, 'control-frame').querySelector('div')).toBeNull()
	})

	it.each([null, false])('renders no actions row for actions={%s}', (actions) => {
		const { container } = renderUI(<Textarea actions={actions} resize="vertical" />)

		expect(bySlot(container, 'textarea-actions')).not.toBeInTheDocument()

		expect(getSlot(container, 'textarea').className).toContain('resize-y')
	})

	it('sizes the actions one step below the textarea, as the Input affixes do', () => {
		const { container } = renderUI(<Textarea size="sm" actions={<Button>send</Button>} />)

		expect(readDensityStep(getSlot(container, 'button'))).toBe('xs')
	})

	it('gives the textarea an id outside a Control', () => {
		const { container } = renderUI(<Textarea />)

		expect(getSlot(container, 'textarea').id).not.toBe('')
	})

	it('renders a bare textarea under headless context', () => {
		const { container } = renderUI(
			<HeadlessProvider>
				<Textarea className="custom" actions={<span>send</span>} />
			</HeadlessProvider>,
		)

		const el = getSlot(container, 'textarea')

		expect(el.className).toBe('custom')

		expect(container.firstElementChild).toBe(el)

		// The actions are content, so they stay, with no row around them.
		expect(el.nextElementSibling).toBe(screen.getByText('send'))

		expect(bySlot(container, 'textarea-actions')).not.toBeInTheDocument()
	})

	it('coerces a null controlled value to an empty string and stays controlled', async () => {
		// §7.3: a wrapper signaling "empty" with value={null} keeps the textarea
		// controlled rather than silently flipping it to uncontrolled.
		const { container } = renderUI(<Textarea value={null} onChange={() => {}} />)

		const el = getSlot<HTMLTextAreaElement>(container, 'textarea')

		expect(el.value).toBe('')

		const user = setupUser()

		await user.type(el, 'abc')

		// Controlled with a fixed '' value: keystrokes can't mutate it.
		expect(el.value).toBe('')
	})

	it('leaves value={undefined} uncontrolled (§7.3)', async () => {
		// §7.3: undefined leaves the control uncontrolled, unlike null; native
		// defaultValue drives it and keystrokes mutate freely.
		const { container } = renderUI(
			<Textarea value={undefined} defaultValue="hi" onChange={() => {}} />,
		)

		const el = getSlot<HTMLTextAreaElement>(container, 'textarea')

		expect(el.value).toBe('hi')

		const user = setupUser()

		await user.type(el, '!')

		expect(el.value).toBe('hi!')
	})

	it('keeps an explicit controlled value over a Form binding of the same name', () => {
		// An explicit `value` wins over the enclosing Form's store, matching Input.
		const { container } = renderUI(
			<Form defaultValues={{ bio: 'stored' }}>
				<Textarea name="bio" value="explicit" onChange={() => {}} />
			</Form>,
		)

		const el = getSlot<HTMLTextAreaElement>(container, 'textarea')

		expect(el.value).toBe('explicit')
	})

	it('stays uncontrolled when no value prop is passed', async () => {
		const { container } = renderUI(<Textarea defaultValue="hi" />)

		const el = getSlot<HTMLTextAreaElement>(container, 'textarea')

		expect(el.value).toBe('hi')

		const user = setupUser()

		await user.type(el, ' there')

		expect(el.value).toBe('hi there')
	})

	it('drops defaultValue from a bound textarea (§7.2)', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		const { container } = renderUI(
			<Form defaultValues={{ bio: '' }}>
				<Textarea name="bio" defaultValue="seed" />
			</Form>,
		)

		const el = getSlot<HTMLTextAreaElement>(container, 'textarea')

		expect(el.value).toBe('')

		expect(el.defaultValue).not.toBe('seed')

		const warned = error.mock.calls.some(([message]) =>
			String(message).includes('both value and defaultValue'),
		)

		expect(warned).toBe(false)
	})
})

describe('Textarea invalid', () => {
	it('marks the field invalid with `invalid`', () => {
		const { container } = renderUI(<Textarea aria-label="Notes" invalid />)

		const el = getSlot<HTMLTextAreaElement>(container, 'textarea')

		expect(el).toHaveAttribute('aria-invalid', 'true')

		expect(el).toHaveAttribute('data-invalid')
	})

	it('leaves the field valid when `invalid` is omitted', () => {
		const { container } = renderUI(<Textarea aria-label="Notes" />)

		expect(getSlot(container, 'textarea')).not.toHaveAttribute('aria-invalid')
	})

	it('lets `invalid={false}` win over an error from the enclosing Control', () => {
		const { container } = renderUI(
			<Control severity="error">
				<Textarea aria-label="Notes" invalid={false} />
			</Control>,
		)

		expect(getSlot(container, 'textarea')).not.toHaveAttribute('aria-invalid')
	})

	it('takes the error of the enclosing Control when `invalid` is omitted', () => {
		const { container } = renderUI(
			<Control severity="error">
				<Textarea aria-label="Notes" />
			</Control>,
		)

		expect(getSlot(container, 'textarea')).toHaveAttribute('aria-invalid', 'true')
	})

	it('keeps the bound invalid state over a stray aria-invalid rest prop (§3.9)', () => {
		const { container } = renderUI(
			<Control severity="error">
				<Textarea aria-label="Notes" aria-invalid={false} />
			</Control>,
		)

		const el = getSlot<HTMLTextAreaElement>(container, 'textarea')

		expect(el).toHaveAttribute('aria-invalid', 'true')

		expect(el).toHaveAttribute('data-invalid')
	})

	it('lets a wrapper re-anchor the data-slot of the textarea (§3.9)', () => {
		const { container } = renderUI(<Textarea aria-label="Notes" data-slot="chat-prompt" />)

		expect(getSlot(container, 'chat-prompt').tagName).toBe('TEXTAREA')

		expect(bySlot(container, 'textarea')).toBeNull()
	})
})

// Safari on iOS and iPadOS draws no native resize grip, so a touch device gets
// the grip of the Textarea. jsdom has no layout, so each test gives the field
// an offset size.
describe('Textarea touch grip', () => {
	function drag(grip: Element, from: { x: number; y: number }, to: { x: number; y: number }) {
		const press = { isPrimary: true, button: 0, pointerId: 1, pointerType: 'touch' }

		fireEvent.pointerDown(grip, { ...press, clientX: from.x, clientY: from.y })

		fireEvent.pointerMove(grip, { ...press, clientX: to.x, clientY: to.y })

		fireEvent.pointerUp(grip, { ...press, clientX: to.x, clientY: to.y })
	}

	function sized(container: HTMLElement, width: number, height: number) {
		const field = getSlot<HTMLTextAreaElement>(container, 'textarea')

		Object.defineProperty(field, 'offsetWidth', { configurable: true, value: width })

		Object.defineProperty(field, 'offsetHeight', { configurable: true, value: height })

		return field
	}

	it.each([
		['vertical', 'h-4'],
		['horizontal', 'w-4'],
	] as const)('renders a grip on the edge that resize="%s" moves', (resize, edge) => {
		const { container } = renderUI(<Textarea resize={resize} />)

		const grip = getSlot(container, 'textarea-grip')

		expect(grip).toHaveAttribute('aria-hidden', 'true')

		expect(grip.className).toContain('pointer-coarse:block')

		expect(grip.className).toContain(edge)

		expect(getSlot(container, 'textarea').className).toContain('pointer-coarse:resize-none')
	})

	it('renders no grip for resize="none", with actions, or under headless context', () => {
		const { container: fixed } = renderUI(<Textarea />)

		const { container: actions } = renderUI(
			<Textarea resize="vertical" actions={<span>send</span>} />,
		)

		const { container: headless } = renderUI(
			<HeadlessProvider>
				<Textarea resize="vertical" />
			</HeadlessProvider>,
		)

		for (const container of [fixed, actions, headless]) {
			expect(bySlot(container, 'textarea-grip')).not.toBeInTheDocument()
		}
	})

	it('sets the height of the field from a vertical drag', () => {
		const { container } = renderUI(<Textarea resize="vertical" />)

		const field = sized(container, 300, 80)

		drag(getSlot(container, 'textarea-grip'), { x: 10, y: 100 }, { x: 40, y: 160 })

		expect(field.style.height).toBe('140px')

		expect(field.style.width).toBe('')
	})

	it('widens a right-to-left field from a drag to the left', () => {
		const { container } = renderUI(
			<div dir="rtl" style={{ direction: 'rtl' }}>
				<Textarea resize="horizontal" />
			</div>,
		)

		const field = sized(container, 300, 80)

		drag(getSlot(container, 'textarea-grip'), { x: 100, y: 10 }, { x: 40, y: 50 })

		expect(field.style.width).toBe('360px')

		expect(field.style.height).toBe('')
	})

	it('ignores a second pointer while one drags the grip', () => {
		const { container } = renderUI(<Textarea resize="vertical" />)

		const field = sized(container, 300, 80)

		const grip = getSlot(container, 'textarea-grip')

		const finger = { isPrimary: true, button: 0, pointerType: 'touch' }

		fireEvent.pointerDown(grip, { ...finger, pointerId: 1, clientY: 100 })

		fireEvent.pointerMove(grip, { ...finger, pointerId: 2, clientY: 400 })

		expect(field.style.height).toBe('')

		fireEvent.pointerMove(grip, { ...finger, pointerId: 1, clientY: 120 })

		expect(field.style.height).toBe('100px')
	})
})

describe('TextareaSkeleton', () => {
	it('writes an explicit size as its own density scope', () => {
		const { container: scoped } = renderUI(<TextareaSkeleton />)

		const { container: lg } = renderUI(<TextareaSkeleton size="lg" />)

		expect(bySlot(scoped, 'placeholder')).not.toHaveAttribute('data-density')

		expect(bySlot(lg, 'placeholder')).toHaveAttribute('data-density', 'lg')
	})

	it('reserves one line for each row', () => {
		const { container } = renderUI(<TextareaSkeleton rows={5} />)

		expect(getSlot(container, 'placeholder').firstElementChild).toHaveStyle({ height: '5lh' })
	})
})
