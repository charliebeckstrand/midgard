import userEvent from '@testing-library/user-event'

/**
 * A `userEvent` instance with no pause between the events that it sends.
 *
 * @remarks
 * By default `userEvent` waits for a macrotask after each key and each pointer
 * action. jsdom needs no such pause, so each wait only adds time. Give
 * `options` to change a default, for example `advanceTimers` under fake timers.
 */
export function setupUser(options?: Parameters<typeof userEvent.setup>[0]) {
	return userEvent.setup({ delay: null, ...options })
}
