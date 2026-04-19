// Alias normalization for grocery product mappings (SDD §7.1).
// Rules: lowercase, trim, collapse interior whitespace to single spaces.
// This is safety-critical — every comparison against the mapping table
// passes through this function. Keep it deterministic and dependency-free.

export function normalizeAlias(input: string): string {
  return input.toLowerCase().trim().replace(/\s+/g, ' ')
}
