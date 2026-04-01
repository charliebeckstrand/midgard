import { cn } from '../core'
import { form } from './form'

export type FormControlProps = React.ComponentPropsWithoutRef<'span'>

/**
 * Outer chrome wrapper for form inputs (Input, Textarea, Select, Combobox, Listbox).
 *
 * Provides the shared focus-ring, border pseudo-elements, and disabled state
 * from `form.control`. Every text-entry or select-like control should wrap
 * its native element in this.
 */
export function FormControl({ className, ...props }: FormControlProps) {
	return <span data-slot="control" className={cn(form.control, className)} {...props} />
}
