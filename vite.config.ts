import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

function adminInvitationsApiPlugin(): Plugin {
  return {
    name: 'admin-invitations-api',
    configureServer(server) {
      server.middlewares.use('/api/admin/invitations', (req, res) => {
        const privatePath = path.resolve(__dirname, 'local-invitations.private.json')
        const examplePath = path.resolve(__dirname, 'local-invitations.example.json')
        const encryptedPath = path.resolve(__dirname, 'src/data/encrypted-invitations.json')

        if (req.method === 'GET') {
          try {
            const sourcePath = fs.existsSync(privatePath) ? privatePath : examplePath
            const raw = fs.existsSync(sourcePath) ? fs.readFileSync(sourcePath, 'utf-8') : '[]'
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ ok: true, items: JSON.parse(raw) }))
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ ok: false, error: String(err) }))
          }
          return
        }

        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', () => {
            try {
              const payload = JSON.parse(body || '{}')
              if (Array.isArray(payload.plainItems)) {
                fs.writeFileSync(
                  privatePath,
                  JSON.stringify(payload.plainItems, null, 2) + '\n',
                  'utf-8',
                )
              }
              if (Array.isArray(payload.encryptedItems)) {
                fs.mkdirSync(path.dirname(encryptedPath), { recursive: true })
                fs.writeFileSync(
                  encryptedPath,
                  JSON.stringify(payload.encryptedItems, null, 2) + '\n',
                  'utf-8',
                )
              }
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ ok: true }))
            } catch (err) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ ok: false, error: String(err) }))
            }
          })
          return
        }

        res.statusCode = 405
        res.end()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), adminInvitationsApiPlugin()],
  server: {
    allowedHosts: ['.trycloudflare.com'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
