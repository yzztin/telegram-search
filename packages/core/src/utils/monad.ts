export interface Result<T> {
  orDefault: (defaultValue: T) => T
  orUndefined: () => T | undefined
  orElse: (fn: () => T) => T
  unwrap: () => T
  unwrapOver: (fn: (error: unknown) => void) => T
  expect: (message?: string) => T
  expectOver: (message?: string, fn?: (error: unknown) => void) => T
  map: <U>(fn: (value: T) => U) => Result<U>
  mapErr: (fn: (error: unknown) => T) => Result<T>
}

export function Ok<T>(value: T): Result<T> {
  return {
    orDefault: () => value,
    orUndefined: () => value,
    orElse: fn => fn(),
    unwrap: () => value,
    unwrapOver: () => value,
    expect: () => value,
    expectOver: () => value,
    map: (fn) => {
      try {
        return Ok(fn(value))
      }
      catch (err: unknown) {
        return Err(err instanceof Error ? err : new Error(String(err)))
      }
    },
    mapErr: (_fn) => {
      return Ok(value)
    },
  }
}

export function Err<T>(error: unknown): Result<T> {
  return {
    orDefault: (defaultValue: T) => defaultValue,
    orUndefined: () => undefined,
    orElse: fn => fn(),
    unwrap: () => {
      throw error
    },
    unwrapOver: (fn) => {
      fn(error)
      throw error
    },
    expect: (message?: string) => {
      const newError = new Error(message ?? 'Result is empty')
      newError.cause = error
      throw newError
    },
    expectOver: (message, fn) => {
      fn?.(error)
      const newError = new Error(message ?? 'Result is empty')
      newError.cause = error
      throw newError
    },
    map: () => {
      return Err(error)
    },
    mapErr: (fn) => {
      return Err(fn(error))
    },
  }
}

export interface Future<T> {
  await: () => Result<Awaited<T>>
}

// export function Async<T>(fn: () => Promise<T>): Future<T> {
//   return {
//     await: async () => {
//       try {
//         return Ok(await fn())
//       }
//       catch (error) {
//         return Err<T>(error)
//       }
//     },
//   }
// }
