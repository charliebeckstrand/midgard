import { cn } from '../core'
import { omote } from '../recipes'

export type FormControlProps = React.ComponentPropsWithoutRef<'span'>

/**
 * Outer chrome wrapper for form inputs (Input, Textarea, Select, Combobox, Listbox).
 *
 * Provides the shared focus-ring, border pseudo-elements, and disabled state
 * from `omote.control`. Every text-entry or select-like control should wrap
 * its native element in this.
 */
export function FormControl({ className, ...props }: FormControlProps) {
	return <span data-slot="control" className={cn(omote.control, className)} {...props} />
}
