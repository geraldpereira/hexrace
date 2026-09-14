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
export const INTACT_DAMAGE: DamageReadout = {
  engine: 100,
  gearbox: 100,
  steering: 100,
  chassis: 100,
  wheelFL: 100,
  wheelFR: 100,
  wheelRL: 100,
  wheelRR: 100,
  suspensionFL: 100,
  suspensionFR: 100,
  suspensionRL: 100,
  suspensionRR: 100,
};
