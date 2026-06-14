const fallback = process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:4000'

const url = process.env.BIFROST_URL ?? fallback

if (!url) {
	throw new Error('BIFROST_URL is not set')
}

export const BIFROST_URL = url
