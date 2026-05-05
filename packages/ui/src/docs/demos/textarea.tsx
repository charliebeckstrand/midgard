import { ArrowUp, Paperclip } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/button'
import { Field, Label } from '../../components/fieldset'
import { Icon } from '../../components/icon'
import { Spacer } from '../../components/spacer'
import { Stack } from '../../components/stack'
import { Textarea } from '../../components/textarea'
import { code } from '../code'
import { Example } from '../components/example'
export const meta = { category: 'Forms' }

const variants = ['default', 'outline'] as const

export default function TextareaDemo() {
	const [withActionsValue, setWithActionsValue] = useState('')

	return (
		<Stack gap="xl">
			<Example title="Default">
				<Field>
					<Label htmlFor="textarea-message">Message</Label>
					<Textarea id="textarea-message" resize="vertical" placeholder="Write your message" />
				</Field>
			</Example>

			<Example title="Variants">
				{variants.map((variant) => (
					<Field key={variant}>
						<Label htmlFor={`textarea-${variant}`}>
							{variant.charAt(0).toUpperCase() + variant.slice(1)}
						</Label>
						<Textarea
							id={`textarea-${variant}`}
							variant={variant}
							resize="vertical"
							placeholder={`This is a ${variant} textarea`}
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

			<Example
				title="With actions"
				code={code`
					import { ArrowUp, Plus } from 'lucide-react'
					import { Button } from 'ui'
					import { Icon } from 'ui'
					import { Spacer } from 'ui'
					import { Textarea } from 'ui'

					<Textarea
						value={value}
						onChange={(e) => setValue(e.target.value)}
						autoResize
						rows={3}
						placeholder="Ask anything"
						actions={
							<Button
								size="sm"
								color="blue"
								disabled={!value.trim()}
								prefix={<Icon icon={<ArrowUp />} />}
							/>
						}
					/>
				`}
			>
				<Field>
					<Label htmlFor="textarea-actions">With actions</Label>
					<Textarea
						id="textarea-actions"
						value={withActionsValue}
						onChange={(e) => setWithActionsValue(e.target.value)}
						autoResize
						rows={3}
						placeholder="Ask anything"
						actions={
							<>
								<Spacer />
								<Button variant="plain" size="sm" prefix={<Icon icon={<Paperclip />} />} />
								<Button
									size="sm"
									color="blue"
									disabled={!withActionsValue.trim()}
									prefix={<Icon icon={<ArrowUp />} />}
								/>
							</>
						}
					/>
				</Field>
			</Example>

			<Example title="Invalid">
				<Field>
					<Label htmlFor="textarea-invalid">Invalid</Label>
					<Textarea id="textarea-invalid" data-invalid={true} placeholder="Something went wrong" />
				</Field>
			</Example>
		</Stack>
	)
}
