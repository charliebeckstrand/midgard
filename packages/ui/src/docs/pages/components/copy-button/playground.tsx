import { Code } from 'ui/code'
import { CopyButton, type CopyButtonProps } from 'ui/copy-button'

const LINK = 'https://example.com/invite/7f3k9q'

export default function CopyButtonPlayground(props: CopyButtonProps) {
	return (
		<>
			<Code>{LINK}</Code>
			<CopyButton {...props} text={LINK} aria-label="Copy invite link" />
		</>
	)
}
