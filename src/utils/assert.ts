export function assertNever(value: never): never {
  throw new Error(`Caso no contemplado: ${String(value)}`)
}
