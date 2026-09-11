import type { ReactNode } from 'react'
import { Form, type FormProps } from '../../components/form'

/**
 * A `renderHook` wrapper that mounts the hook inside a `Form` with the given
 * props: `defaultValues` at least, and `validate` / `validateOn` where the
 * case needs them. Kept off the `helpers` barrel: it imports the Form
 * component, which the form hook suites already load and nothing else needs.
 */
export function makeFormWrapper<T extends Record<string, unknown>>(
	props: Omit<FormProps<T>, 'children'>,
) {
	return ({ children }: { children: ReactNode }) => <Form {...props}>{children}</Form>
}
