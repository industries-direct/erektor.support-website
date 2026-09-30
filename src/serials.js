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
  // The number the ClearCore reports in its identity line
  // (ERKT-ID v=1 serial=<u32> ...): unsigned 32-bit, no leading zeros.
  electronics: /^(0|[1-9]\d{0,9})$/,
  // Stamped on the leg: (side)-(version)(product initial)(manufacture order #),
  // e.g. L-V3BE123 for the left leg of manufacture order 123.
  mechanical: /^[LR]-V\d{1,2}[A-Z]{1,3}\d{3}$/
};

export const EXAMPLE = {
  electronics: '305419896',
  mechanical: 'L-V3BE123'
};

/** Normalise as the field does: trimmed and upper-case, or '' for nothing. */
export const normalise = (v) => String(v == null ? '' : v).trim().toUpperCase();

export const valid = (identity, value) => {
  const v = normalise(value);
  if (!SERIAL[identity].test(v)) return false;
  return identity !== 'electronics' || Number(v) <= 0xFFFFFFFF;
};
