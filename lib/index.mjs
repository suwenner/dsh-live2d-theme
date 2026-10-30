// dsh-live2d-theme 宿主半侧：
//  - GET /dsh-live2d-theme/*        静态资源（运行时、模型、背景）
//  - GET /dsh-live2d-theme/models   列出可用模型
//  - POST /dsh-live2d-theme/config  保存 config.json
//  - POST /dsh-live2d-theme/upload  上传背景图 -> background/bg.<ext>
import { createReadStream } from 'node:fs'
import { stat, writeFile, mkdir, readdir } from 'node:fs/promises'
import { extname, join, normalize, resolve, sep, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'dsh-live2d-theme'
export const inject = []

const __dirname = dirname(fileURLToPath(import.meta.url))
// 资源根目录：默认用包内 assets/（自包含，可发布）；
// 可用 profile 配置 config.dataDir 指到用户自定义目录（例如 D:\工具\live2）。
function resolveRoot(config) {
  const custom = config && typeof config.dataDir === 'string' ? config.dataDir.trim() : ''
  if (custom) return resolve(custom)
  return resolve(__dirname, '..', 'assets')
}

const MIME = {
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.moc': 'application/octet-stream',
  '.moc3': 'application/octet-stream',
  '.mtn': 'application/octet-stream',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.woff2': 'font/woff2',
}

function send(response, status, body, type = 'text/plain; charset=utf-8') {
  response.writeHead(status, { 'content-type': type, 'cache-control': 'no-cache' })
  response.end(body)
}

function sendJson(response, status, payload) {
  send(response, status, JSON.stringify(payload), 'application/json; charset=utf-8')
}

function readBody(request, maxBytes = 20 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    request.on('data', (chunk) => {
      size += chunk.length
      if (size > maxBytes) {
        reject(new Error('body too large'))
        try { request.destroy() } catch { /* ignore */ }
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => resolve(Buffer.concat(chunks)))
    request.on('error', reject)
  })
}

async function ensureDir(dir) {
  try { await mkdir(dir, { recursive: true }) } catch { /* ignore */ }
}

export function apply(ctx, config) {
  const LIVE2_DIR = resolveRoot(config)
  ctx.inject(['webServer'], (host) => {
    host.effect(() => {
      const disposers = []
      const track = (d) => { if (typeof d === 'function') disposers.push(d); return d }

      // ---- POST /dsh-live2d-theme/config：保存配置 ----
      try {
        track(host.webServer.register({
          kind: 'exact',
          path: '/dsh-live2d-theme/config',
          handler: async (request, response) => {
            if (request.method !== 'POST') {
              response.writeHead(405, { allow: 'POST' })
              response.end()
              return
            }
            try {
              const raw = (await readBody(request)).toString('utf8')
              const cfg = JSON.parse(raw)
              if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) {
                sendJson(response, 400, { ok: false, error: 'invalid config' })
                return
              }
              await ensureDir(LIVE2_DIR)
              await writeFile(join(LIVE2_DIR, 'config.json'), JSON.stringify(cfg, null, 2), 'utf8')
              sendJson(response, 200, { ok: true })
            } catch (e) {
              sendJson(response, 400, { ok: false, error: String(e?.message || e) })
            }
          },
        }))
      } catch (e) {
        console.warn('[dsh-live2d-theme] config route failed:', e?.message || e)
      }

      // ---- POST /dsh-live2d-theme/upload：上传背景图 ----
      try {
        track(host.webServer.register({
          kind: 'exact',
          path: '/dsh-live2d-theme/upload',
          handler: async (request, response) => {
            if (request.method !== 'POST') {
              response.writeHead(405, { allow: 'POST' })
              response.end()
              return
            }
            try {
              const raw = (await readBody(request)).toString('utf8')
              const payload = JSON.parse(raw)
              const dataUrl = String(payload?.data || '')
              const match = dataUrl.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i)
              if (!match) {
                sendJson(response, 400, { ok: false, error: 'expect data:image/*;base64,...' })
                return
              }
              const mime = match[1].toLowerCase()
              const ext = mime === 'image/jpeg' ? 'jpg'
                : mime === 'image/png' ? 'png'
                : mime === 'image/webp' ? 'webp'
                : mime === 'image/gif' ? 'gif'
                : 'jpg'
              const buf = Buffer.from(match[2], 'base64')
              const dir = join(LIVE2_DIR, 'background')
              await ensureDir(dir)
              const file = join(dir, 'bg.' + ext)
              await writeFile(file, buf)
              sendJson(response, 200, { ok: true, path: '/dsh-live2d-theme/background/bg.' + ext })
            } catch (e) {
              sendJson(response, 400, { ok: false, error: String(e?.message || e) })
            }
          },
        }))
      } catch (e) {
        console.warn('[dsh-live2d-theme] upload route failed:', e?.message || e)
      }

      // ---- GET /dsh-live2d-theme/models：列出可用模型 ----
      try {
        track(host.webServer.register({
          kind: 'exact',
          path: '/dsh-live2d-theme/models',
          handler: async (request, response) => {
            if (request.method !== 'GET') {
              response.writeHead(405, { allow: 'GET' })
              response.end()
              return
            }
            try {
              const modelsDir = join(LIVE2_DIR, 'models')
              const entries = await readdir(modelsDir, { withFileTypes: true }).catch(() => [])
              const models = []
              for (const entry of entries) {
                if (!entry.isDirectory()) continue
                const sub = join(modelsDir, entry.name)
                const files = await readdir(sub).catch(() => [])
                const model4 = files.find((f) => /\.model3\.json$/i.test(f))
                const model2 = files.find((f) => /^model\.json$/i.test(f) || /\.model\.json$/i.test(f))
                if (model4) {
                  models.push({
                    name: entry.name,
                    url: '/dsh-live2d-theme/models/' + encodeURIComponent(entry.name) + '/' + encodeURIComponent(model4),
                    format: 'cubism4',
                  })
                } else if (model2) {
                  models.push({
                    name: entry.name,
                    url: '/dsh-live2d-theme/models/' + encodeURIComponent(entry.name) + '/' + encodeURIComponent(model2),
                    format: 'cubism2',
                  })
                }
              }
              models.sort((a, b) => a.name.localeCompare(b.name))
              sendJson(response, 200, { ok: true, models })
            } catch (e) {
              sendJson(response, 400, { ok: false, error: String(e?.message || e) })
            }
          },
        }))
      } catch (e) {
        console.warn('[dsh-live2d-theme] models route failed:', e?.message || e)
      }

      // ---- GET /dsh-live2d-theme/*：静态资源 ----
      try {
        track(host.webServer.register({
          kind: 'prefix',
          path: '/dsh-live2d-theme',
          handler: async (request, response) => {
            if (request.method !== 'GET' && request.method !== 'HEAD') {
              response.writeHead(405, { allow: 'GET, HEAD' })
              response.end()
              return
            }
            const url = new URL(request.url ?? '/', 'http://127.0.0.1')
            const rel = decodeURIComponent(url.pathname).replace(/^\/dsh-live2d-theme\/?/, '')
            const root = resolve(LIVE2_DIR)
            const target = normalize(join(root, rel))
            if (target !== root && !target.startsWith(root + sep)) {
              send(response, 403, 'forbidden')
              return
            }
            let st
            try {
              st = await stat(target)
            } catch {
              send(response, 404, 'not found')
              return
            }
            if (!st.isFile()) {
              send(response, 404, 'not found')
              return
            }
            const type = MIME[extname(target).toLowerCase()] || 'application/octet-stream'
            response.writeHead(200, {
              'content-type': type,
              'content-length': st.size,
              'cache-control': 'no-cache',
            })
            if (request.method === 'HEAD') {
              response.end()
              return
            }
            createReadStream(target).pipe(response)
          },
        }))
      } catch (e) {
        console.warn('[dsh-live2d-theme] static route failed:', e?.message || e)
      }

      return () => {
        for (const d of disposers) {
          try { d?.() } catch { /* ignore */ }
        }
      }
    })
  })
}

export default { name, inject, apply }
