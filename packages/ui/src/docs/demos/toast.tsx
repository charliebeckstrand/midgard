import { Button } from '../../components/button'
import { ToastProvider, useToast } from '../../components/toast'
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

function ActionToastButton() {
	const { toast } = useToast()

	return (
		<Button
			variant="outline"
			onClick={() =>
				toast({
					title: 'Message deleted',
					description: 'The message has been removed.',
					action: { label: 'Undo', onClick: () => {} },
				})
			}
		>
			With action
		</Button>
	)
}

export default function ToastDemo() {
	return (
		<ToastProvider>
			<div className="space-y-8">
				<Example
					title="Types"
					code={code`
						import { ToastProvider, useToast } from 'ui/toast'
						import { Button } from 'ui/button'

						function App() {
							const { toast } = useToast()

							return (
								<Button onClick={() => toast({ title: 'Saved', type: 'success' })}>
									Show toast
								</Button>
							)
						}

						<ToastProvider>
							<App />
						</ToastProvider>
					`}
				>
					<ToastButtons />
				</Example>

				<Example
					title="With action"
					code={code`
						toast({
							title: 'Message deleted',
							description: 'The message has been removed.',
							action: { label: 'Undo', onClick: () => {} },
						})
					`}
				>
					<ActionToastButton />
				</Example>
			</div>
		</ToastProvider>
	)
}
