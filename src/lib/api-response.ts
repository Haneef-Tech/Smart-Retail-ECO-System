import { NextResponse } from 'next/server'
import { z } from 'zod'

/** Consistent JSON envelope for all API routes. */
export function apiSuccess<T>(data: T, status = 200, extra?: Record<string, unknown>) {
  return NextResponse.json({ success: true, data, ...extra }, { status })
}

export function apiError(message: string, status = 400, errors?: Array<{ path: string; message: string }>) {
  return NextResponse.json(
    { success: false, error: message, ...(errors ? { errors } : {}) },
    { status }
  )
}

export interface ValidationOk<T> {
  ok: true
  data: T
}
export interface ValidationFail {
  ok: false
  response: NextResponse
}

function toErrorList(err: z.ZodError): Array<{ path: string; message: string }> {
  return err.issues.map((i) => ({
    path: i.path.length > 0 ? i.path.join('.') : '(root)',
    message: i.message,
  }))
}

/** Validate unknown input against a schema. Returns data or a 400 JSON response. */
export function validate<T>(
  schema: z.ZodType<T>,
  input: unknown
): ValidationOk<T> | ValidationFail {
  const parsed = schema.safeParse(input)
  if (parsed.success) return { ok: true, data: parsed.data }
  return {
    ok: false,
    response: apiError('Validation failed', 400, toErrorList(parsed.error)),
  }
}

/** Validate URL query params (?a=1&b=x) against a schema (use z.coerce for numbers/booleans). */
export function validateQuery<T>(
  schema: z.ZodType<T>,
  req: { url: string }
): ValidationOk<T> | ValidationFail {
  const url = new URL(req.url)
  const obj: Record<string, string> = {}
  url.searchParams.forEach((v, k) => {
    obj[k] = v
  })
  return validate(schema, obj)
}

/** Safely parse a JSON body; 400s on malformed JSON instead of throwing. */
export async function readJsonBody(req: Request): Promise<{ ok: true; body: unknown } | { ok: false; response: NextResponse }> {
  try {
    return { ok: true, body: await req.json() }
  } catch {
    return { ok: false, response: apiError('Invalid JSON request body', 400) }
  }
}
