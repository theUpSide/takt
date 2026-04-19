import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts'
import { normalizeAlias } from './normalize.ts'

Deno.test('normalizeAlias: lowercases input', () => {
  assertEquals(normalizeAlias('MILK'), 'milk')
  assertEquals(normalizeAlias('Wheat Bread'), 'wheat bread')
})

Deno.test('normalizeAlias: trims leading and trailing whitespace', () => {
  assertEquals(normalizeAlias('  milk  '), 'milk')
  assertEquals(normalizeAlias('\tmilk\n'), 'milk')
})

Deno.test('normalizeAlias: collapses interior whitespace', () => {
  assertEquals(normalizeAlias('wheat    bread'), 'wheat bread')
  assertEquals(normalizeAlias('granola\tbars'), 'granola bars')
  assertEquals(normalizeAlias('a  b  c'), 'a b c')
})

Deno.test('normalizeAlias: handles empty and whitespace-only inputs', () => {
  assertEquals(normalizeAlias(''), '')
  assertEquals(normalizeAlias('   '), '')
})

Deno.test('normalizeAlias: preserves non-ASCII characters', () => {
  assertEquals(normalizeAlias('Jalapeño'), 'jalapeño')
})

Deno.test('normalizeAlias: does NOT remove punctuation', () => {
  // Punctuation is preserved so aliases like "100% juice" or "2% milk"
  // remain distinct from their unpunctuated counterparts.
  assertEquals(normalizeAlias('2% Milk'), '2% milk')
  assertEquals(normalizeAlias("hershey's"), "hershey's")
})
