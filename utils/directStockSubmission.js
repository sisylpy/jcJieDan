let sequence = 0

function nextIdempotencyKey() {
  sequence += 1
  return 'owner-direct-stock-' + Date.now().toString(36) + '-' +
    sequence.toString(36) + '-' + Math.random().toString(36).slice(2, 12)
}

function release(owner, marker) {
  if (owner && owner.__directStockSubmission === marker) {
    owner.__directStockSubmission = null
  }
}

/**
 * Starts one direct-stock request for a page instance.
 *
 * A repeated tap while the request is pending receives the same key/promise but
 * is marked as not started, so the page does not attach a second UI completion
 * handler or send a second request.
 */
function begin(owner, request, payload) {
  if (!owner || typeof request !== 'function') {
    throw new Error('direct stock submission requires an owner and request function')
  }
  const pending = owner.__directStockSubmission
  if (pending) {
    return {
      started: false,
      key: pending.key,
      promise: pending.promise
    }
  }

  const marker = {
    key: nextIdempotencyKey(),
    promise: null
  }
  owner.__directStockSubmission = marker
  marker.promise = Promise.resolve()
    .then(() => request(payload, marker.key))
    .then(result => {
      release(owner, marker)
      return result
    }, error => {
      release(owner, marker)
      throw error
    })

  return {
    started: true,
    key: marker.key,
    promise: marker.promise
  }
}

module.exports = {
  begin,
  nextIdempotencyKey
}
