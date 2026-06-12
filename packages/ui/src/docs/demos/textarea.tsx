import { ArrowUp, Paperclip } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '../../components/button'
import { Field, Label } from '../../components/fieldset'
import { Icon } from '../../components/icon'
import { Spacer } from '../../components/spacer'
import { Textarea } from '../../components/textarea'
import { Example } from '../components/example'
import { capitalize } from '../components/format'

const variants = ['default', 'outline'] as const
const sizes = ['sm', 'md', 'lg'] as const

function WithActionsExample() {
	const [withActionsValue, setWithActionsValue] = useState('')

	const id = useId()

	return (
		<Field>
			<Label htmlFor={id}>With actions</Label>
			<Textarea
				id={id}
				value={withActionsValue}
				onChange={(e) => setWithActionsValue(e.target.value)}
				autoResize
				rows={1}
				placeholder="Ask anything"
				actions={
					<>
						<Spacer />
						<Button aria-label="Attach file" variant="plain" size="sm">
							<Icon icon={<Paperclip />} />
						</Button>
						<Button aria-label="Send" size="sm" color="blue" disabled={!withActionsValue.trim()}>
							<Icon icon={<ArrowUp />} />
						</Button>
					</>
				}
			/>
		</Field>
	)
}

export function Demo() {
	return (
		<>
			<Example title="Default">
				<Field>
					<Label htmlFor="textarea-message">Message</Label>
					<Textarea id="textarea-message" resize="vertical" placeholder="Write your message" />
				</Field>
			</Example>

			<Example title="Variants">
				{variants.map((variant) => (
					<Field key={variant}>
						<Label htmlFor={`textarea-${variant}`}>{capitalize(variant)}</Label>
						<Textarea
							id={`textarea-${variant}`}
							variant={variant}
							resize="vertical"
							placeholder={`This is a ${variant} textarea`}
						/>
					</Field>
				))}
			</Example>

			<Example title="Sizes">
				{sizes.map((size) => (
					<Field key={size}>
						<Label htmlFor={`textarea-size-${size}`}>{capitalize(size)}</Label>
						<Textarea
							id={`textarea-size-${size}`}
							size={size}
							placeholder={`This is a ${size} textarea`}
						/>
					</Field>
				))}
			</Example>

			<Example title="Non-resizable">
				<Field>
					<Label htmlFor="textarea-non-resizable">Non-resizable</Label>
					<Textarea id="textarea-non-resizable" placeholder="Cannot resize" />
				</Field>
			</Example>

			<Example title="Auto resize">
				<Field>
					<Label htmlFor="textarea-auto-resize">Auto resize</Label>
					<Textarea id="textarea-auto-resize" autoResize rows={1} placeholder="Grows as you type" />
				</Field>
			</Example>

			<Example title="With actions">
				<WithActionsExample />
			</Example>

			<Example title="Invalid">
				<Field>
					<Label htmlFor="textarea-invalid">Invalid</Label>
					<Textarea id="textarea-invalid" data-invalid={true} placeholder="Something went wrong" />
				</Field>
			</Example>
		</>
	)
}
