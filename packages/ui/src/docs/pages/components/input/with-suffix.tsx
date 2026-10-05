import { Input } from 'ui/input'

export default function WithSuffix() {
	return <Input suffix=".example.com" aria-label="Subdomain" placeholder="acme" />
}
