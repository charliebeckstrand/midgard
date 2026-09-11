import type { ReactNode } from 'react'
import { Form } from '../../components/form'

/**
 * A `renderHook` wrapper that mounts the hook inside a `Form` seeded with
 * `defaultValues`. Kept off the `helpers` barrel: it imports the Form
 * component, which the form hook suites already load and nothing else needs.
 */
export function makeFormWrapper<T extends Record<string, unknown>>(defaultValues: T) {
	return ({ children }: { children: ReactNode }) => (
		<Form defaultValues={defaultValues}>{children}</Form>
	)
}
