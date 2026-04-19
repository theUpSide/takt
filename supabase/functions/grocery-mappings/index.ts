// Grocery Cart Automation: product mappings CRUD (SDD §6.2.2)
// GET    /grocery-mappings          — list current user's mappings
// POST   /grocery-mappings          — create a mapping
// PUT    /grocery-mappings/:id      — update a mapping
// DELETE /grocery-mappings/:id      — soft-delete (is_active=false)
//
// Row Level Security enforces per-user scoping; service role bypasses RLS
// but we still pass the user's JWT through so auth.uid() resolves.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { normalizeAlias } from '../_shared/grocery/normalize.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface MappingInput {
  alias: string
  kroger_upc: string
  product_name: string
  default_quantity?: number
  category?: string | null
  allergen_notes?: string | null
  is_active?: boolean
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status)
}

function validateMappingInput(input: Partial<MappingInput>): string | null {
  if (input.alias !== undefined) {
    if (typeof input.alias !== 'string' || input.alias.trim() === '') {
      return 'alias must be a non-empty string'
    }
    if (input.alias.length > 100) return 'alias exceeds 100 characters'
  }
  if (input.kroger_upc !== undefined) {
    if (typeof input.kroger_upc !== 'string' || !/^\d{8,20}$/.test(input.kroger_upc)) {
      return 'kroger_upc must be 8–20 digits'
    }
  }
  if (input.product_name !== undefined) {
    if (typeof input.product_name !== 'string' || input.product_name.trim() === '') {
      return 'product_name must be a non-empty string'
    }
    if (input.product_name.length > 255) return 'product_name exceeds 255 characters'
  }
  if (input.default_quantity !== undefined) {
    if (!Number.isInteger(input.default_quantity) || input.default_quantity < 1) {
      return 'default_quantity must be a positive integer'
    }
  }
  return null
}

function idFromPath(pathname: string): string | null {
  // Path is /grocery-mappings or /grocery-mappings/{id}
  const parts = pathname.split('/').filter(Boolean)
  const last = parts[parts.length - 1]
  if (!last || last === 'grocery-mappings') return null
  return last
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return errorResponse('Missing Authorization header', 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return errorResponse('Unauthorized', 401)

  const url = new URL(req.url)
  const id = idFromPath(url.pathname)

  try {
    switch (req.method) {
      case 'GET': {
        const category = url.searchParams.get('category')
        const includeInactive = url.searchParams.get('include_inactive') === 'true'
        let query = supabase.from('product_mappings').select('*').order('alias')
        if (!includeInactive) query = query.eq('is_active', true)
        if (category) query = query.eq('category', category)
        const { data, error } = await query
        if (error) return errorResponse(error.message, 500)
        return jsonResponse({ mappings: data })
      }

      case 'POST': {
        const body = await req.json() as MappingInput
        const validationError = validateMappingInput(body)
        if (validationError) return errorResponse(validationError, 400)
        const row = {
          alias: normalizeAlias(body.alias),
          kroger_upc: body.kroger_upc,
          product_name: body.product_name.trim(),
          default_quantity: body.default_quantity ?? 1,
          category: body.category ?? null,
          allergen_notes: body.allergen_notes ?? null,
          is_active: body.is_active ?? true,
        }
        const { data, error } = await supabase
          .from('product_mappings')
          .insert(row)
          .select()
          .single()
        if (error) {
          if (error.code === '23505') {
            return errorResponse('Mapping already exists for this alias + UPC', 409)
          }
          return errorResponse(error.message, 500)
        }
        return jsonResponse({ mapping: data }, 201)
      }

      case 'PUT': {
        if (!id) return errorResponse('Missing mapping id', 400)
        const body = await req.json() as Partial<MappingInput>
        const validationError = validateMappingInput(body)
        if (validationError) return errorResponse(validationError, 400)
        const patch: Record<string, unknown> = {}
        if (body.alias !== undefined) patch.alias = normalizeAlias(body.alias)
        if (body.kroger_upc !== undefined) patch.kroger_upc = body.kroger_upc
        if (body.product_name !== undefined) patch.product_name = body.product_name.trim()
        if (body.default_quantity !== undefined) patch.default_quantity = body.default_quantity
        if (body.category !== undefined) patch.category = body.category
        if (body.allergen_notes !== undefined) patch.allergen_notes = body.allergen_notes
        if (body.is_active !== undefined) patch.is_active = body.is_active
        if (Object.keys(patch).length === 0) return errorResponse('No fields to update', 400)
        const { data, error } = await supabase
          .from('product_mappings')
          .update(patch)
          .eq('id', id)
          .select()
          .single()
        if (error) return errorResponse(error.message, 500)
        if (!data) return errorResponse('Mapping not found', 404)
        return jsonResponse({ mapping: data })
      }

      case 'DELETE': {
        if (!id) return errorResponse('Missing mapping id', 400)
        const { data, error } = await supabase
          .from('product_mappings')
          .update({ is_active: false })
          .eq('id', id)
          .select()
          .single()
        if (error) return errorResponse(error.message, 500)
        if (!data) return errorResponse('Mapping not found', 404)
        return jsonResponse({ mapping: data })
      }

      default:
        return errorResponse('Method not allowed', 405)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return errorResponse(message, 500)
  }
})
