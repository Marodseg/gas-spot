export function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

export function titleCase(value: string): string {
  const lower = value.trim().toLocaleLowerCase('es-ES')
  if (!lower) return ''
  return lower.replace(/(^|[\s./-])(\p{L})/gu, (match) => match.toLocaleUpperCase('es-ES'))
}
