import { Copy } from 'lucide-react'
import { CopyButton } from 'ui/copy-button'

export default function CustomIcon() {
	return <CopyButton text="https://example.com" icon={<Copy />} />
}
