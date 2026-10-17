import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Button } from '../../../components/button'
import { Input } from '../../../components/input'
import { Listbox } from '../../../components/listbox'
import { ListboxOption } from '../../../components/listbox/listbox-option'
import { TYPEAHEAD_TIMEOUT_MS } from '../../../hooks/a11y/use-typeahead'
import { Form } from '../../../modules/form'
import { renderUI, screen, waitFor } from '../../helpers'
import { FieldProbe, getFieldProbe } from '../../helpers/field-probe'

/**
 * Listbox focus containment (real floating engine). Asserts that opening the
 * listbox pulls focus into the panel and keeps it contained: Tab dismisses the
 * surface and carries focus to the next tabbable (a select closes on Tab
 * rather than trapping like a dialog) and Escape / selection return focus to
 * the trigger. `FloatingFocusManager`'s guards and `closeOnFocusOut` don't
 * engage under jsdom (mocked).
 */

const panelSelector = '[data-slot="popover-panel"]'

const findPanel = () =>
	waitFor(() => {
		const panel = document.querySelector<HTMLElement>(panelSelector)

		if (!panel) throw new Error('panel not mounted')

		return panel
	})

const isOpen = () => !!document.querySelector(panelSelector)

describe('Listbox focus (real browser)', () => {
	it('moves focus to the selected option on open', async () => {
		renderUI(
			<Listbox aria-label="pick" value="b" displayValue={(value: string) => value}>
				<ListboxOption value="a">A</ListboxOption>
				<ListboxOption value="b">B</ListboxOption>
			</Listbox>,
		)

		await userEvent.click(screen.getByRole('combobox', { name: 'pick' }))

		const panel = await findPanel()

		await waitFor(() => expect(panel.contains(document.activeElement)).toBe(true))

		// Focus settles on the selected option, marked by the presence boolean
		// `data-selected` (`dataAttr` renders it value-less, not `"true"`); poll
		// for it rather than assert synchronously (CONVENTIONS §10.3).
		await waitFor(() => expect(document.activeElement?.hasAttribute('data-selected')).toBe(true))
	})

	// APG select-only combobox: a printable key on the closed trigger opens the
	// list and moves to the first option that matches. The keys that follow
	// extend the same type-ahead buffer, so `ch` reaches Cherry past Cantaloupe.
	// The buffer resets after an idle window. A slow runner can take longer than
	// that window between the two keys, so the case holds the reset timer.
	it('opens on a printable key and moves to the matching option', async () => {
		const setTimer = globalThis.setTimeout

		const timers = vi
			.spyOn(globalThis, 'setTimeout')
			.mockImplementation(((callback: () => void, ms?: number, ...args: unknown[]) =>
				ms === TYPEAHEAD_TIMEOUT_MS ? 0 : setTimer(callback, ms, ...args)) as typeof setTimeout)

		onTestFinished(() => timers.mockRestore())

		renderUI(
			<Listbox aria-label="pick">
				<ListboxOption value="apple">Apple</ListboxOption>
				<ListboxOption value="cantaloupe">Cantaloupe</ListboxOption>
				<ListboxOption value="cherry">Cherry</ListboxOption>
			</Listbox>,
		)

		const trigger = screen.getByRole('combobox', { name: 'pick' })

		trigger.focus()

		await userEvent.keyboard('c')

		await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'true'))

		await waitFor(() => expect(document.activeElement).toHaveTextContent('Cantaloupe'))

		await userEvent.keyboard('h')

		await waitFor(() => expect(document.activeElement).toHaveTextContent('Cherry'))

		// Each key restarted the held reset timer of the buffer.
		expect(timers.mock.calls.filter(([, ms]) => ms === TYPEAHEAD_TIMEOUT_MS)).toHaveLength(2)
	})

	it('does not open on a printable key while read-only', async () => {
		renderUI(
			<Listbox aria-label="pick" readOnly>
				<ListboxOption value="apple">Apple</ListboxOption>
			</Listbox>,
		)

		const trigger = screen.getByRole('combobox', { name: 'pick' })

		trigger.focus()

		await userEvent.keyboard('a')

		expect(trigger).toHaveAttribute('aria-expanded', 'false')

		expect(trigger).toHaveFocus()
	})

	// Guards the APG select pattern: Tab dismisses the listbox and the keystroke
	// proceeds, landing focus on the next tabbable after the trigger: not
	// snapped back to the trigger, not stranded on `<body>`.
	it('dismisses the listbox on Tab and moves focus to the next tabbable', async () => {
		renderUI(
			<>
				<Listbox aria-label="pick">
					<ListboxOption value="a">A</ListboxOption>
					<ListboxOption value="b">B</ListboxOption>
				</Listbox>
				<Button>Outside</Button>
			</>,
		)

		await userEvent.click(screen.getByRole('combobox', { name: 'pick' }))

		const panel = await findPanel()

		await waitFor(() => expect(panel.contains(document.activeElement)).toBe(true))

		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(isOpen()).toBe(false))

		await waitFor(() => expect(screen.getByRole('button', { name: 'Outside' })).toHaveFocus())
	})

	it('dismisses the listbox on Shift+Tab and moves focus to the previous tabbable', async () => {
		renderUI(
			<>
				<Button>Before</Button>
				<Listbox aria-label="pick">
					<ListboxOption value="a">A</ListboxOption>
					<ListboxOption value="b">B</ListboxOption>
				</Listbox>
			</>,
		)

		await userEvent.click(screen.getByRole('combobox', { name: 'pick' }))

		const panel = await findPanel()

		await waitFor(() => expect(panel.contains(document.activeElement)).toBe(true))

		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

		await waitFor(() => expect(isOpen()).toBe(false))

		await waitFor(() => expect(screen.getByRole('button', { name: 'Before' })).toHaveFocus())
	})

	// APG select pattern: Tab accepts the highlighted option, Escape cancels.
	it('commits the highlighted option on Tab', async () => {
		renderUI(
			<>
				{/* `capitalize={false}`: the trigger first-word-capitalizes its display
				    string by default, which would render the committed value `b` as
				    `B` — indistinguishable from the option's own label. Verbatim, the
				    lowercase text can only have come from `displayValue(value)`, so the
				    assertion still proves the commit rather than the label. */}
				<Listbox aria-label="pick" capitalize={false} displayValue={(value: string) => value}>
					<ListboxOption value="a">A</ListboxOption>
					<ListboxOption value="b">B</ListboxOption>
				</Listbox>
				<Button>Outside</Button>
			</>,
		)

		const trigger = screen.getByRole('combobox', { name: 'pick' })

		await userEvent.click(trigger)

		const panel = await findPanel()

		await waitFor(() => expect(panel.contains(document.activeElement)).toBe(true))

		await userEvent.keyboard('{ArrowDown}{ArrowDown}')

		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(isOpen()).toBe(false))

		await waitFor(() => expect(trigger).toHaveTextContent('b'))

		await waitFor(() => expect(screen.getByRole('button', { name: 'Outside' })).toHaveFocus())
	})

	// Tabbing out on the already-selected option must not re-toggle it: with
	// `nullable`, onSelect on the current value clears the selection.
	it('does not clear a nullable selection when tabbing out on the selected option', async () => {
		renderUI(
			<>
				{/* Verbatim display, as above, so `b` can only be the retained value. */}
				<Listbox
					aria-label="pick"
					nullable
					defaultValue="b"
					capitalize={false}
					displayValue={(value: string) => value}
				>
					<ListboxOption value="a">A</ListboxOption>
					<ListboxOption value="b">B</ListboxOption>
				</Listbox>
				<Button>Outside</Button>
			</>,
		)

		const trigger = screen.getByRole('combobox', { name: 'pick' })

		await userEvent.click(trigger)

		const panel = await findPanel()

		// Initial focus lands on the selected option.
		await waitFor(() => expect(panel.contains(document.activeElement)).toBe(true))

		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(isOpen()).toBe(false))

		await waitFor(() => expect(trigger).toHaveTextContent('b'))
	})

	it('closes without toggling on Tab in multiple mode', async () => {
		const onValueChange = vi.fn()

		renderUI(
			<>
				<Listbox
					aria-label="pick"
					multiple
					defaultValue={['a']}
					onValueChange={onValueChange}
					displayValue={(value: string) => value}
				>
					<ListboxOption value="a">A</ListboxOption>
					<ListboxOption value="b">B</ListboxOption>
				</Listbox>
				<Button>Outside</Button>
			</>,
		)

		await userEvent.click(screen.getByRole('combobox', { name: 'pick' }))

		const panel = await findPanel()

		await waitFor(() => expect(panel.contains(document.activeElement)).toBe(true))

		await userEvent.keyboard('{ArrowDown}{ArrowDown}')

		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(isOpen()).toBe(false))

		expect(onValueChange).not.toHaveBeenCalled()

		await waitFor(() => expect(screen.getByRole('button', { name: 'Outside' })).toHaveFocus())
	})

	it('returns focus to the trigger on Escape', async () => {
		renderUI(
			<Listbox aria-label="pick">
				<ListboxOption value="a">A</ListboxOption>
				<ListboxOption value="b">B</ListboxOption>
			</Listbox>,
		)

		const trigger = screen.getByRole('combobox', { name: 'pick' })

		await userEvent.click(trigger)

		await findPanel()

		await userEvent.keyboard('{Escape}')

		await waitFor(() => expect(isOpen()).toBe(false))

		await waitFor(() => expect(trigger).toHaveFocus())
	})

	it('returns focus to the trigger after selecting an option', async () => {
		renderUI(
			<Listbox aria-label="pick" displayValue={(value: string) => value}>
				<ListboxOption value="a">A</ListboxOption>
				<ListboxOption value="b">B</ListboxOption>
			</Listbox>,
		)

		const trigger = screen.getByRole('combobox', { name: 'pick' })

		await userEvent.click(trigger)

		await findPanel()

		await userEvent.click(screen.getByRole('option', { name: 'A' }))

		await waitFor(() => expect(isOpen()).toBe(false))

		await waitFor(() => expect(trigger).toHaveFocus())
	})
})

/**
 * The touched mark after a close that does not come back to the trigger. The
 * focus is in the panel, so the trigger does not blur again, and the close
 * itself must mark the bound field touched. `onBlur` stays the blur of the
 * trigger, so it does not fire on this path. The outside press needs a real
 * floating ref, which the jsdom mock does not attach, so the case needs the
 * real engine. The input is before the listbox, so the panel does not cover
 * it.
 */
describe('Listbox touched on a close away from the trigger (real browser)', () => {
	it('marks the bound field touched when a press outside closes the menu', async () => {
		const onBlur = vi.fn()

		renderUI(
			<Form defaultValues={{ plan: undefined }}>
				<Input aria-label="Name" />
				<Listbox<string> name="plan" aria-label="pick" onBlur={onBlur}>
					<ListboxOption value="a">A</ListboxOption>
					<ListboxOption value="b">B</ListboxOption>
				</Listbox>
				<FieldProbe name="plan" />
			</Form>,
		)

		await userEvent.click(screen.getByRole('combobox', { name: 'pick' }))

		const panel = await findPanel()

		await waitFor(() => expect(panel.contains(document.activeElement)).toBe(true))

		expect(getFieldProbe('plan')).toHaveAttribute('data-touched', 'false')

		await userEvent.click(screen.getByRole('textbox', { name: 'Name' }))

		await waitFor(() => expect(isOpen()).toBe(false))

		await waitFor(() => expect(getFieldProbe('plan')).toHaveAttribute('data-touched', 'true'))

		expect(onBlur).not.toHaveBeenCalled()
	})
})
