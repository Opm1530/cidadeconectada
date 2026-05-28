import { NextResponse } from 'next/server'
import type { ApiResponse } from '@cc/shared'

export function ok<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status })
}

export function created<T>(data: T): NextResponse<ApiResponse<T>> {
  return ok(data, 201)
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

export function badRequest(error: string): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error }, { status: 400 })
}

export function unauthorized(error = 'Não autenticado'): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error }, { status: 401 })
}

export function forbidden(error = 'Sem permissão'): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error }, { status: 403 })
}

export function notFound(error = 'Não encontrado'): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error }, { status: 404 })
}

export function conflict(error: string): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error }, { status: 409 })
}

export function serverError(error = 'Erro interno do servidor'): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error }, { status: 500 })
}
