import type { ReactNode } from 'react'
import { Button } from 'ui/button'
import { Checkbox, CheckboxField } from 'ui/checkbox'
import { useCopyButtonState } from 'ui/copy-button'
import { cn } from 'ui/core'
import { Label } from 'ui/fieldset'
import { Flex } from 'ui/flex'
import { Sheet, SheetBody, SheetClose, SheetFooter, SheetPanel } from 'ui/sheet'
import { dan } from '../../recipes/kiso/dan/index.ts'

/**
 * The bottom sheet of a debug tool: the title row, the body, and the footer.
 * The sheet takes the height of its content, up to the height of the screen,
 * and the body scrolls.
 */
export function SheetFrame({
	open,
	onOpenChange,
	title,
	actions,
	footer,
	children,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	/** The start of the title row. It holds the `SheetTitle`. */
	title: ReactNode
	/** The controls at the end of the title row. */
	actions?: ReactNode
	/** The buttons at the start of the footer. Close is at the end. */
	footer: ReactNode
	children: ReactNode
}) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetPanel side="bottom" className="max-h-full">
				{/* The row takes the inset of the title, as the slot does. */}
				<Flex wrap align="center" gap="md" className={cn(dan.space.panel.x, dan.space.panel.top)}>
					{title}
					{actions}
				</Flex>
				<SheetBody className="min-h-0 flex-1 overflow-auto">{children}</SheetBody>
				<SheetFooter className="justify-between">
					<Flex gap="sm">{footer}</Flex>
					<SheetClose />
				</SheetFooter>
			</SheetPanel>
		</Sheet>
	)
}

/** A checkbox with a label, such as "Preserve", on one flag of a journal. */
export function FlagField({
	label,
	checked,
	onChange,
}: {
	label: string
	checked: boolean
	onChange: (checked: boolean) => void
}) {
	return (
		<CheckboxField>
			<Checkbox checked={checked} onChange={(event) => onChange(event.target.checked)} />
			<Label>{label}</Label>
		</CheckboxField>
	)
}

/** A button with the text label "Copy" that copies `text`, with the copied state of `CopyButton`. */
export function CopyTextButton({ text }: { text: string }) {
	const { copied, copy } = useCopyButtonState({ text })

	return (
		<Button size="sm" color={copied ? 'green' : undefined} onClick={() => void copy()}>
			{copied ? 'Copied' : 'Copy'}
		</Button>
	)
}
