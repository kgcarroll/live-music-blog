export function JsonLd({data}: {data: Record<string, unknown>}) {
  if (!data['@context']) return null

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{__html: JSON.stringify(data)}}
    />
  )
}
