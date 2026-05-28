/**
 * Next.js Instrumentation Hook — roda uma vez na inicialização do servidor.
 * Verifica a conexão com o banco de dados e loga o resultado.
 */
export async function register() {
  // Só roda no servidor Node.js (não no edge runtime)
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const { prisma } = await import('@cc/database')

  try {
    await prisma.$queryRaw`SELECT 1`
    console.log('✅ \x1b[32mBanco de dados conectado com sucesso\x1b[0m')
  } catch (err) {
    console.error('❌ \x1b[31mFalha ao conectar ao banco de dados:\x1b[0m', err)
  }
}
