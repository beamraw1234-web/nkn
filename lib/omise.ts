import { getOmiseRuntimeConfig } from '@/lib/omise-config'

type OmiseClient = {
  charges: {
    create: (data: Record<string, unknown>, callback?: (err: unknown, charge: unknown) => void) => unknown
    retrieve: (id: string, callback?: (err: unknown, charge: unknown) => void) => unknown
  }
}

let cachedClient: OmiseClient | null = null
let cachedSignature: string | null = null

export async function getOmiseClient(): Promise<OmiseClient> {
  const config = await getOmiseRuntimeConfig()
  if (!config.secretKey) throw new Error('Missing Omise secret key')

  const signature = `${config.secretKey}|${config.publicKey || ''}|${config.omiseVersion}`
  if (cachedClient && cachedSignature === signature) return cachedClient

  const mod: unknown = await import('omise')
  const modObj = mod as { default?: unknown }
  const candidate = typeof modObj.default === 'function' ? modObj.default : mod
  if (typeof candidate !== 'function') {
    throw new Error('Invalid Omise client factory')
  }
  const omiseFactory = candidate as (options: { secretKey: string; publicKey?: string; omiseVersion?: string }) => OmiseClient
  cachedClient = omiseFactory({
    secretKey: config.secretKey,
    publicKey: config.publicKey || undefined,
    omiseVersion: config.omiseVersion
  })
  cachedSignature = signature
  return cachedClient
}

export async function omiseCreateCharge(data: Record<string, unknown>): Promise<unknown> {
  const client = await getOmiseClient()
  return await new Promise<unknown>((resolve, reject) => {
    client.charges.create(data, (err: unknown, charge: unknown) => {
      if (err) reject(err)
      else resolve(charge)
    })
  })
}

export async function omiseRetrieveCharge(id: string): Promise<unknown> {
  const client = await getOmiseClient()
  return await new Promise<unknown>((resolve, reject) => {
    client.charges.retrieve(id, (err: unknown, charge: unknown) => {
      if (err) reject(err)
      else resolve(charge)
    })
  })
}
