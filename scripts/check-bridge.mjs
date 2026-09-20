import assert from 'node:assert/strict'
const sent = []
globalThis.window = { parent: { postMessage: (...args) => sent.push(args) }, location: { origin: 'https://example.test' } }
const { bridge } = await import('../src/shell/bridge.ts')
bridge.finished(0, 0, 9240, true)
bridge.finished(0, 0, 9240, false)
assert.notEqual(sent[0][0].finishId, sent[1][0].finishId)
for (const [message, origin] of sent) {
  assert.match(message.finishId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  assert.equal(origin, window.location.origin)
}
window.parent = window
bridge.finished(0, 0, 9240, false)
assert.equal(sent.length, 2, 'standalone game does not send parent messages')
console.log('ok - unique finish IDs, same-origin target, standalone isolation')
