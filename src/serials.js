/**
 * Serial formats, server side.
 *
 * data/hardware.json is the single source of truth and the client reads it
 * directly to drive validation and placeholders. These patterns are the same
 * declaration, held where a Worker request can check it without a fetch, and
 * they are shared by the public intake and the registry so the two cannot
 * drift apart from each other. Change hardware.json and change these together.
 */
export const SERIAL = {
  electronics: /^EL-\d{2}-\d{6}$/,
  mechanical: /^MX-\d{2}-\d{5}$/
};

export const EXAMPLE = {
  electronics: 'EL-25-014873',
  mechanical: 'MX-24-08192'
};

/** Normalise as the field does: trimmed and upper-case, or '' for nothing. */
export const normalise = (v) => String(v == null ? '' : v).trim().toUpperCase();

export const valid = (identity, value) => SERIAL[identity].test(normalise(value));
