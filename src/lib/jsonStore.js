// 여러 사람이 동시에 고칠 수 있는 작은 JSON 파일(알림함, 북마크 등)을 안전하게 갱신하는 도우미.
// 최신 내용을 읽고 → 바꾸고 → 저장. 그 사이에 누가 먼저 저장해서 충돌(409/422)이 나면 다시 시도해요.

export async function updateJsonFile(client, path, mutate, { fallback = () => ({}), message, retries = 3 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const current = await client.getJson(path, { fresh: true })
    const next = mutate(current ? current.json : fallback())
    if (next === undefined) return current?.json ?? null // 바꿀 게 없으면 저장하지 않음
    try {
      await client.putJson(path, next, { sha: current?.sha, message: message || `update ${path}` })
      return next
    } catch (e) {
      const conflict = e?.status === 409 || e?.status === 422
      if (!conflict || attempt >= retries) throw e
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 500))
    }
  }
}

// 같은 파일에 대한 내 쓰기 요청이 서로 엉키지 않도록 한 줄로 세워요.
const queues = new Map()
export function enqueue(key, task) {
  const prev = queues.get(key) || Promise.resolve()
  const next = prev.catch(() => {}).then(task)
  queues.set(key, next)
  return next
}
