import { createContext, createRef, type FC, Profiler, type ReactNode, use } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	createSelectOption,
	Option,
	type OptionSelectionContext,
	useOptionSelection,
} from '../../primitives/option/option'
import { createKeyedStore } from '../../utilities'
import { bySlot, fireEvent, noop, renderUI, screen } from '../helpers'

describe('Option', () => {
	it('sets aria-selected when selected', () => {
		renderUI(
			<Option selected={true} onSelect={() => {}}>
				Option
			</Option>,
		)

		const option = screen.getByRole('option')

		expect(option).toHaveAttribute('aria-selected', 'true')
	})

	it('sets aria-disabled when disabled', () => {
		renderUI(
			<Option selected={false} disabled onSelect={() => {}}>
				Option
			</Option>,
		)

		const option = screen.getByRole('option')

		expect(option).toHaveAttribute('aria-disabled', 'true')
	})

	it.for([
		{ name: 'calls onSelect on click', press: (option: HTMLElement) => fireEvent.click(option) },
		{
			name: 'selects on Enter key',
			press: (option: HTMLElement) => fireEvent.keyDown(option, { key: 'Enter' }),
		},
		{
			name: 'selects on Space key',
			press: (option: HTMLElement) => fireEvent.keyDown(option, { key: ' ' }),
		},
	])('$name', ({ press }) => {
		const onSelect = vi.fn()

		renderUI(
			<Option selected={false} onSelect={onSelect}>
				Option
			</Option>,
		)

		press(screen.getByRole('option'))

		expect(onSelect).toHaveBeenCalledOnce()
	})

	it.for([
		{
			name: 'does not call onSelect when disabled',
			press: (option: HTMLElement) => fireEvent.click(option),
		},
		{
			name: 'does not select when Enter is pressed and disabled',
			press: (option: HTMLElement) => fireEvent.keyDown(option, { key: 'Enter' }),
		},
	])('$name', ({ press }) => {
		const onSelect = vi.fn()

		renderUI(
			<Option selected={false} disabled onSelect={onSelect}>
				Option
			</Option>,
		)

		press(screen.getByRole('option'))

		expect(onSelect).not.toHaveBeenCalled()
	})

	it('ignores keys other than Enter and Space', () => {
		const onSelect = vi.fn()

		renderUI(
			<Option selected={false} onSelect={onSelect}>
				Option
			</Option>,
		)

		fireEvent.keyDown(screen.getByRole('option'), { key: 'a' })

		expect(onSelect).not.toHaveBeenCalled()
	})

	it('runs a consumer onClick first, then selects', () => {
		const calls: string[] = []

		renderUI(
			<Option
				selected={false}
				onSelect={() => calls.push('select')}
				onClick={() => calls.push('consumer')}
			>
				Option
			</Option>,
		)

		fireEvent.click(screen.getByRole('option'))

		expect(calls).toEqual(['consumer', 'select'])
	})

	it('selects after a consumer preventDefault, on click and on Enter', () => {
		const onSelect = vi.fn()

		renderUI(
			<Option
				selected={false}
				onSelect={onSelect}
				onClick={(event) => event.preventDefault()}
				onKeyDown={(event) => event.preventDefault()}
			>
				Option
			</Option>,
		)

		const option = screen.getByRole('option')

		fireEvent.click(option)

		fireEvent.keyDown(option, { key: 'Enter' })

		expect(onSelect).toHaveBeenCalledTimes(2)
	})

	it('runs a consumer onMouseDown and still holds focus in an active-descendant list', () => {
		const onMouseDown = vi.fn()

		renderUI(
			<Option selected={false} onSelect={() => {}} activeDescendant onMouseDown={onMouseDown}>
				Option
			</Option>,
		)

		const held = fireEvent.mouseDown(screen.getByRole('option'))

		expect(onMouseDown).toHaveBeenCalledOnce()

		// `fireEvent` returns false when a handler canceled the event.
		expect(held).toBe(false)
	})

	it('renders the default check icon invisible until the row is selected', () => {
		const { container } = renderUI(
			<Option selected={false} onSelect={() => {}}>
				Option
			</Option>,
		)

		const className = bySlot(container, 'icon')?.getAttribute('class') ?? ''

		expect(className).toContain('invisible')

		expect(className).toContain('group-data-selected/option:visible')
	})

	it('sizes the default check icon with a stepped class, which follows the nearest scope', () => {
		const { container } = renderUI(
			<Option selected={true} onSelect={() => {}}>
				Option
			</Option>,
		)

		expect(bySlot(container, 'icon')).toHaveClass('density-size-[4,4.5,5,5.5,6]')
	})
})

const SelectionContext = createContext<OptionSelectionContext>({
	selection: createKeyedStore(() => false),
	multiple: false,
	onSelect: noop,
})

const TestContext: FC<{
	children: ReactNode
	value?: unknown
	multiple?: boolean
	capitalize?: boolean
}> = ({ children, value, multiple = false, capitalize }) => {
	const selection = useOptionSelection(value, multiple)

	return (
		<SelectionContext value={{ selection, multiple, onSelect: noop, capitalize }}>
			{children}
		</SelectionContext>
	)
}

const {
	Option: SelectOption,
	Label,
	Text,
	Description,
} = createSelectOption({
	slotPrefix: 'test',
	useSelection: () => use(SelectionContext),
})

describe('createSelectOption', () => {
	it('Option renders with its data-slot', () => {
		const { container } = renderUI(
			<TestContext>
				<SelectOption value="a">Item A</SelectOption>
			</TestContext>,
		)

		const option = bySlot(container, 'test-option')

		expect(option).toBeInTheDocument()
	})

	it('Option passes native attributes, handlers, and a ref to its row', () => {
		const ref = createRef<HTMLDivElement>()

		const onMouseEnter = vi.fn()

		renderUI(
			<TestContext>
				<SelectOption
					value="a"
					ref={ref}
					title="First"
					data-testid="option-a"
					onMouseEnter={onMouseEnter}
				>
					Item A
				</SelectOption>
			</TestContext>,
		)

		const option = screen.getByRole('option')

		expect(ref.current).toBe(option)

		expect(option).toHaveAttribute('title', 'First')

		expect(option).toHaveAttribute('data-testid', 'option-a')

		fireEvent.mouseEnter(option)

		expect(onMouseEnter).toHaveBeenCalledOnce()
	})

	it('Option keeps its role and its selection over consumer attributes', () => {
		renderUI(
			<TestContext value="a">
				{/* @ts-expect-error: the props omit `role`, and a stray value must not land */}
				<SelectOption value="a" role="button">
					Item A
				</SelectOption>
			</TestContext>,
		)

		expect(screen.getByRole('option')).toHaveAttribute('aria-selected', 'true')
	})

	it('Description renders with its data-slot', () => {
		const { container } = renderUI(
			<TestContext>
				<Description>My Desc</Description>
			</TestContext>,
		)

		const description = bySlot(container, 'test-description')

		expect(description).toBeInTheDocument()

		expect(screen.getByText('My Desc')).toBeInTheDocument()
	})

	it('Text renders with its data-slot and holds the label over the description', () => {
		const { container } = renderUI(
			<TestContext>
				<Text>
					<Label>My Label</Label>

					<Description>My Desc</Description>
				</Text>
			</TestContext>,
		)

		const text = bySlot(container, 'test-text')

		expect(text).toContainElement(bySlot(container, 'test-label'))

		expect(text).toContainElement(bySlot(container, 'test-description'))

		expect(text).toHaveClass('flex-col')
	})

	it('Label capitalizes a string label when the host asks for it', () => {
		renderUI(
			<TestContext capitalize>
				<SelectOption value="a">
					<Label>lower case</Label>
				</SelectOption>
			</TestContext>,
		)

		expect(screen.getByText('Lower case')).toBeInTheDocument()
	})

	it('Label does not re-render when only the selection changes', () => {
		const labelCommits = vi.fn()

		// The option children are created once, so a commit under a Profiler
		// comes from the Label itself and not from its parent.
		const options = ['a', 'b', 'c'].map((value) => (
			<SelectOption key={value} value={value}>
				<Profiler id={value} onRender={labelCommits}>
					<Label>{value}</Label>
				</Profiler>
			</SelectOption>
		))

		const { rerender } = renderUI(
			<TestContext value="a" capitalize>
				{options}
			</TestContext>,
		)

		labelCommits.mockClear()

		rerender(
			<TestContext value="b" capitalize>
				{options}
			</TestContext>,
		)

		expect(labelCommits).not.toHaveBeenCalled()

		expect(screen.getByRole('option', { name: 'B' })).toHaveAttribute('aria-selected', 'true')
	})
	it.each([
		{ multiple: false, before: 'a', after: 'b', changed: ['a', 'b'] },
		{ multiple: true, before: ['a'], after: ['a', 'c'], changed: ['c'] },
	])(
		'a selection change renders only the options whose state changes (multiple: $multiple)',
		({ multiple, before, after, changed }) => {
			const commits = vi.fn()

			// The options are created once, so a commit under a Profiler comes from
			// the option itself and not from its parent.
			const options = ['a', 'b', 'c', 'd'].map((value) => (
				<Profiler key={value} id={value} onRender={commits}>
					<SelectOption value={value}>{value}</SelectOption>
				</Profiler>
			))

			const { rerender } = renderUI(
				<TestContext value={before} multiple={multiple}>
					{options}
				</TestContext>,
			)

			commits.mockClear()

			rerender(
				<TestContext value={after} multiple={multiple}>
					{options}
				</TestContext>,
			)

			expect(commits.mock.calls.map(([id]) => id).sort()).toEqual(changed)

			expect(screen.getByRole('option', { name: 'c' })).toHaveAttribute(
				'aria-selected',
				String(multiple),
			)
		},
	)
})
