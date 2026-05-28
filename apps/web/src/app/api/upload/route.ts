import { NextRequest } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth/session'
import { ok, badRequest, unauthorized } from '@/lib/api-response'
import { uploadToStorage } from '@/lib/storage'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

// POST /api/upload — recebe multipart/form-data com campo "file"
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return unauthorized()

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return badRequest('Requisição inválida — envie multipart/form-data')
  }

  const file = formData.get('file')
  if (!file || !(file instanceof Blob)) return badRequest('Campo "file" ausente')

  if (!ALLOWED_TYPES.includes(file.type)) {
    return badRequest('Tipo de arquivo não permitido. Use JPEG, PNG, WebP ou GIF.')
  }
  if (file.size > MAX_SIZE_BYTES) {
    return badRequest('Arquivo muito grande. Tamanho máximo: 5 MB.')
  }

  const folder = (formData.get('folder') as string | null) ?? 'uploads'
  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    const url = await uploadToStorage(buffer, file.type, folder)
    return ok({ url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao fazer upload'
    return badRequest(message)
  }
}
