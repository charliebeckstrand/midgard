'use client'

import { useRef, useState } from 'react'
import { Button } from '../../components/button'
import { Dialog } from '../../components/dialog'
import { DialogActions, DialogBody, DialogTitle } from '../../components/dialog/slots'
import { Flex } from '../../components/flex'
import { SignaturePad, type SignaturePadHandle } from '../../components/signature-pad'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

function Default() {
	const [value, setValue] = useState<string | null>(null)
	const [previewOpen, setPreviewOpen] = useState(false)

	return (
		<Example title="Default">
			<Stack gap="md">
				<SignaturePad value={value} onChange={setValue} />
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
							<DialogActions>
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
							</DialogActions>
						</Dialog>
					</>
				)}
			</Stack>
		</Example>
	)
}

function ImperativeHandle() {
	const ref = useRef<SignaturePadHandle>(null)

	const [value, setValue] = useState<string | null>(null)
	const [saved, setSaved] = useState<string | null>(null)

	return (
		<Example title="Imperative handle">
			<Stack gap="md">
				<SignaturePad ref={ref} defaultValue={null} hideClear onChange={setValue} />
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

function Disabled() {
	return (
		<Example title="Disabled">
			<SignaturePad disabled placeholder="Signature locked" />
		</Example>
	)
}

export default function SignaturePadDemo() {
	return (
		<Stack gap="xl">
			<Default />
			<ImperativeHandle />
			<Disabled />
		</Stack>
	)
}
