// Temporary diagnostic: summarize a Chromium net log that may be cut short.
import { readFileSync } from 'node:fs'

const text = readFileSync(process.argv[2], 'utf8')
const start = text.indexOf('"events"')
const constants = JSON.parse(`${text.slice(0, start).replace(/,\s*$/, '')}}`).constants
const typeName = Object.fromEntries(Object.entries(constants.logEventTypes).map(([k, v]) => [v, k]))
const sourceName = Object.fromEntries(Object.entries(constants.logSourceType).map(([k, v]) => [v, k]))
const errorName = Object.fromEntries(Object.entries(constants.netError).map(([k, v]) => [v, k]))
const offset = Number(constants.timeTickOffset)
const events = []
for (const line of text.slice(start).split('\n')) {
	const json = line.trim().replace(/,$/, '')
	if (!json.startsWith('{')) continue
	try {
		events.push(JSON.parse(json))
	} catch {}
}
const at = (e) => new Date(offset + Number(e.time)).toISOString()
const name = (e) => `${typeName[e.type]} (${sourceName[e.source.type]} ${e.source.id})`
console.log(`events: ${events.length}, from ${at(events[0])} to ${at(events.at(-1))}`)
for (const e of events) {
	if (/^(NETWORK_CHANGED|NETWORK_CONNECTIVITY_CHANGED|NETWORK_IP_ADDRESSES_CHANGED|DNS_CONFIG_CHANGED|PROXY_CONFIG_CHANGED|QUIC_SESSION_POOL_ON_IP_ADDRESS_CHANGED)$/.test(typeName[e.type] ?? '')) console.log(at(e), name(e), JSON.stringify(e.params ?? {}))
}
const errors = events.filter((e) => typeof e.params?.net_error === 'number' && e.params.net_error < 0)
const counts = {}
for (const e of errors) {
	const key = `${typeName[e.type]} ${errorName[e.params.net_error]}`
	counts[key] = (counts[key] ?? 0) + 1
}
console.log(counts)
for (const e of errors.slice(-40)) console.log(at(e), name(e), errorName[e.params.net_error])
const ws = events.filter((e) => {
	const t = typeName[e.type] ?? ''
	if (!t.startsWith('WEBSOCKET')) return false
	return !t.endsWith('FRAME_HEADER') || e.params?.opcode === 8
})
for (const e of ws.slice(-40)) console.log(at(e), name(e), JSON.stringify(e.params ?? {}))
