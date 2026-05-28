import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'

const configured =
  !!process.env.STORAGE_ENDPOINT &&
  !!process.env.STORAGE_BUCKET &&
  !!process.env.STORAGE_ACCESS_KEY &&
  !!process.env.STORAGE_SECRET_KEY

function createS3Client() {
  const client = new S3Client({
    endpoint: process.env.STORAGE_ENDPOINT!,
    region: process.env.STORAGE_REGION ?? 'auto',
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY!,
      secretAccessKey: process.env.STORAGE_SECRET_KEY!,
    },
    forcePathStyle: false,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  })

  // O SDK v3 recente adiciona headers x-amz-checksum-* que o R2 não aceita.
  // Este middleware os remove antes que a assinatura seja enviada.
  client.middlewareStack.add(
    (next: any) => async (args: any) => {
      const { request } = args
      if (request?.headers) {
        for (const key of Object.keys(request.headers)) {
          const lower = key.toLowerCase()
          if (
            lower.startsWith('x-amz-checksum') ||
            lower === 'x-amz-sdk-checksum-algorithm'
          ) {
            delete request.headers[key]
          }
        }
      }
      return next(args)
    },
    { step: 'finalizeRequest', name: 'stripR2ChecksumHeaders', priority: 'low' },
  )

  return client
}

const s3 = configured ? createS3Client() : null

export async function uploadToStorage(
  buffer: Buffer,
  mimeType: string,
  folder = 'uploads',
): Promise<string> {
  if (!s3 || !configured) {
    throw new Error('Storage não configurado. Defina as variáveis STORAGE_* no .env')
  }

  const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'bin'
  const key = `${process.env.STORAGE_BUCKET}/${folder}/${randomUUID()}.${ext}`

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.STORAGE_BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ContentLength: buffer.length, // obrigatório para streaming correto
    }),
  )

  const baseUrl = (process.env.STORAGE_PUBLIC_URL ?? process.env.STORAGE_ENDPOINT!).replace(/\/$/, '')
  return `${baseUrl}/${key}`
}
