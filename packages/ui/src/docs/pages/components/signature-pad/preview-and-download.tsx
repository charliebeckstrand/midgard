import { useState } from 'react'
import { Button } from 'ui/button'
import { Flex } from 'ui/flex'
import { SignaturePad } from 'ui/signature-pad'

export default function PreviewAndDownload() {
	const [signature, setSignature] = useState<string | null>(null)

	return (
		<>
			<SignaturePad value={signature} onValueChange={setSignature} />
			{signature && (
				<Flex gap="md" align="center">
					<img
						src={signature}
						alt="Signature preview"
						className="h-16 rounded-md border border-zinc-200 bg-white"
					/>
					<Button href={signature} download="signature.png">
						Download
					</Button>
				</Flex>
			)}
		</>
	)
}
