import NotMeClient from './NotMeClient'

export const dynamic = 'force-dynamic'

export default async function NotMePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const tokenRaw = sp?.token
  const token = Array.isArray(tokenRaw) ? (tokenRaw[0] || '') : (tokenRaw || '')
  return <NotMeClient token={token} />
}
