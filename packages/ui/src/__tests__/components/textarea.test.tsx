import { describe, expect, it, vi } from 'vitest'
import { Button } from '../../components/button'
import { Form } from '../../components/form'
import { Textarea, TextareaSkeleton } from '../../components/textarea'
import { HeadlessProvider } from '../../providers/headless'
import { bySlot, densityStepOf, getSlot, renderUI, screen, userEvent } from '../helpers'

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

		const user = userEvent.setup({ delay: null })

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

	it('sizes the actions one step below the textarea, as the Input affixes do', () => {
		const { container } = renderUI(<Textarea size="sm" actions={<Button>send</Button>} />)

		expect(densityStepOf(getSlot(container, 'button'))).toBe('xs')
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

		expect(screen.queryByText('send')).toBeNull()
	})

	it('coerces a null controlled value to an empty string and stays controlled', async () => {
		// §7.3: a wrapper signaling "empty" with value={null} keeps the textarea
		// controlled rather than silently flipping it to uncontrolled.
		const { container } = renderUI(<Textarea value={null} onChange={() => {}} />)

		const el = getSlot<HTMLTextAreaElement>(container, 'textarea')

		expect(el.value).toBe('')

		const user = userEvent.setup({ delay: null })

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

		const user = userEvent.setup({ delay: null })

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

		const user = userEvent.setup({ delay: null })

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

		error.mockRestore()
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

		expect(bySlot(container, 'placeholder')).toHaveStyle({ height: '5lh' })
	})
})
