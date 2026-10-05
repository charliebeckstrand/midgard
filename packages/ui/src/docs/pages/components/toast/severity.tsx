import { Button } from 'ui/button'
import { Toast, ToastProvider, useToast } from 'ui/toast'

function SeverityButtons() {
	const { toast } = useToast()

	return (
		<>
			<Button
				onClick={() =>
					toast({ title: 'Update available', description: 'Version 2.4 is ready to install.' })
				}
			>
				Info
			</Button>
			<Button
				onClick={() =>
					toast({
						title: 'Draft saved',
						description: 'Your draft is saved on this device.',
						severity: 'neutral',
					})
				}
			>
				Neutral
			</Button>
			<Button
				onClick={() =>
					toast({
						title: 'Changes saved',
						description: 'Your profile is up to date.',
						severity: 'success',
					})
				}
			>
				Success
			</Button>
			<Button
				onClick={() =>
					toast({
						title: 'Storage almost full',
						description: 'You have used 90% of your storage.',
						severity: 'warning',
					})
				}
			>
				Warning
			</Button>
			<Button
				onClick={() =>
					toast({
						title: 'Upload failed',
						description: 'Check your connection and try again.',
						severity: 'error',
					})
				}
			>
				Error
			</Button>
		</>
	)
}

export default function Severity() {
	return (
		<ToastProvider>
			<SeverityButtons />
			<Toast />
		</ToastProvider>
	)
}
