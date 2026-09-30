import { useRef, useState } from 'react'
import { Button } from '../../../components/button'
import { Dialog, DialogBody, DialogFooter, DialogTitle } from '../../../components/dialog'
import { SignaturePad, type SignaturePadHandle } from '../../../components/signature-pad'
import { Text } from '../../../components/text'
import { Flex } from '../../../structure/flex'
import { Stack } from '../../../structure/stack'
import { Axes, Example } from '../../engine'

function DefaultExample() {
	const [value, setValue] = useState<string | null>(null)
	const [previewOpen, setPreviewOpen] = useState(false)

	return (
		<Example title="Default">
			<Stack gap="md">
				<SignaturePad value={value} onValueChange={setValue} />
				{value && (
					<>
						<Text color="green">Captured!</Text>
						<Button onClick={() => setPreviewOpen(true)}>Preview</Button>
						<Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
							<DialogTitle>Signature Preview</DialogTitle>
							<DialogBody>
								<img
									alt="Signature preview"
									src={value}
									className="border border-zinc-200 dark:border-zinc-700 bg-white p-2"
								/>
							</DialogBody>
							<DialogFooter>
								<Button
									color="blue"
									onClick={() => {
										const link = document.createElement('a')
										link.href = value
										link.download = 'signature.png'
										link.click()
									}}
								>
									Download
								</Button>
								<Button onClick={() => setPreviewOpen(false)}>Close</Button>
							</DialogFooter>
						</Dialog>
					</>
				)}
			</Stack>
		</Example>
	)
}

function ImperativeHandleExample() {
	const ref = useRef<SignaturePadHandle>(null)

	const [value, setValue] = useState<string | null>(null)
	const [saved, setSaved] = useState<string | null>(null)

	return (
		<Example title="Imperative handle">
			<Stack gap="md">
				<SignaturePad ref={ref} defaultValue={null} clearable={false} onValueChange={setValue} />
				{value && (
					<Flex gap="sm">
						<Button
							variant="soft"
							color="blue"
							onClick={() => {
								if (ref.current?.isEmpty()) {
									setSaved(null)

									return
								}
								setSaved(ref.current?.toDataURL() ?? null)
							}}
						>
							Save
						</Button>
						<Button
							variant="soft"
							color="amber"
							onClick={() => {
								ref.current?.clear()
								setSaved(null)
							}}
						>
							Clear
						</Button>
					</Flex>
				)}
				{saved && <Text color="green">Saved {saved.length} characters</Text>}
			</Stack>
		</Example>
	)
}

export function Demo() {
	return (
		<>
			<Axes
				of="SignaturePad"
				render={(props, label) => (
					// The pad draws no stored value, so the clear button shows only after a stroke.
					<div className="w-72">
						<SignaturePad {...props} placeholder={label} />
					</div>
				)}
			/>

			<DefaultExample />
			<ImperativeHandleExample />
		</>
	)
}
