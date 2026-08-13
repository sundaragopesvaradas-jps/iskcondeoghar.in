import React from 'react';

/**
 * Bold the leading characters that match `prefix` (case-insensitive).
 * Preserves the name's original casing.
 */
export function renderNameWithBoldPrefix(name: string, prefix: string): React.ReactNode {
  if (!prefix) return name;
  const nameLower = name.toLowerCase();
  const prefixLower = prefix.toLowerCase();
  if (!nameLower.startsWith(prefixLower)) {
    return name;
  }
  const matchLen = prefix.length;
  return (
    <>
      <strong>{name.slice(0, matchLen)}</strong>
      {name.slice(matchLen)}
    </>
  );
}
