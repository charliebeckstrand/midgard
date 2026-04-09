import { Button } from '../../components/button'
import { Toast, useToast } from '../../components/toast'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: 'Feedback' }

function ToastButtons() {
	const { toast } = useToast()

	return (
		<div className="flex flex-wrap gap-2">
			<Button variant="outline" onClick={() => toast({ title: 'Event created' })}>
				Default
			</Button>
			<Button
				variant="outline"
				onClick={() =>
					toast({
						title: 'Draft saved',
						description: 'Your draft has been saved locally.',
						type: 'secondary',
					})
				}
			>
				Secondary
			</Button>
			<Button
				variant="outline"
				onClick={() =>
					toast({ title: 'Saved', description: 'Your changes have been saved.', type: 'success' })
				}
			>
				Success
			</Button>
			<Button
				variant="outline"
				onClick={() =>
					toast({ title: 'Warning', description: 'Storage is almost full.', type: 'warning' })
				}
			>
				Warning
			</Button>
			<Button
				variant="outline"
				onClick={() =>
					toast({ title: 'Error', description: 'Something went wrong.', type: 'error' })
				}
			>
				Error
			</Button>
		</div>
	)
}

function PersistToastButton() {
	const { toast } = useToast()

	return (
		<Button
			variant="outline"
			onClick={() =>
				toast({
					title: 'Attention:',
					description: 'This toast will stay until dismissed.',
					persist: true,
				})
			}
		>
			Persist
		</Button>
	)
}

function ActionToastButton() {
	const { toast } = useToast()

	return (
		<Button
			variant="outline"
			onClick={() =>
				toast({
					title: 'Message deleted',
					description: 'The message has been removed.',
					type: 'success',
					duration: 7000,
					actions: <Button>Undo</Button>,
				})
			}
		>
			With action
		</Button>
	)
}

export default function ToastDemo() {
	return (
		<Toast>
			<div className="space-y-8">
				<Example
					title="Types"
					code={code`
						import { Toast, useToast } from 'ui/toast'
						import { Button } from 'ui/button'

						function App() {
							const { toast } = useToast()

							return (
								<Button onClick={() => toast({ title: 'Saved', type: 'success' })}>
									Show toast
								</Button>
							)
						}

						<Toast>
							<App />
						</Toast>
					`}
				>
					<ToastButtons />
				</Example>

				<Example
					title="Persist"
					code={code`
						toast({
							title: 'Attention:',
							description: 'This toast will stay until dismissed.',
							persist: true,
						})
					`}
				>
					<PersistToastButton />
				</Example>

				<Example
					title="With action"
					code={code`
						import { Button } from 'ui/button'

						toast({
							title: 'Message deleted',
							description: 'The message has been removed.',
							actions: <Button size="sm">Undo</Button>,
						})
					`}
				>
					<ActionToastButton />
				</Example>
			</div>
		</Toast>
	)
}
