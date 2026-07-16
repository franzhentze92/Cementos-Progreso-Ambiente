/** Tipado mínimo para importar catalog.json del conocimiento del chat. */
declare module '*.json' {
  const value: {
    generatedAt: string | null
    sourceDir: string
    documentCount: number
    documents: Array<{
      id: string
      title: string
      category: string
      sourcePath: string
      pages: number
      sizeMb: number
      hash?: string
      truncated?: boolean
      note?: string
      charCount: number
      summary: string
      text: string
      mdFile?: string | null
    }>
  }
  export default value
}
