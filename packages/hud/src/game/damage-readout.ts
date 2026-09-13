export const DAMAGE_PARTS = [
  'engine',
  'gearbox',
  'steering',
  'chassis',
  'wheelFL',
  'wheelFR',
  'wheelRL',
  'wheelRR',
  'suspensionFL',
  'suspensionFR',
  'suspensionRL',
  'suspensionRR',
] as const;

export type DamagePart = (typeof DAMAGE_PARTS)[number];

/** Each part's state, 100 intact down to 0 broken (functional spec 3.7 and 7.5). */
export type DamageReadout = Readonly<Record<DamagePart, number>>;

/** Everything intact. */
export function intactDamage(): DamageReadout {
  return Object.fromEntries(DAMAGE_PARTS.map((p) => [p, 100])) as Record<DamagePart, number>;
}
