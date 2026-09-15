import { type Zone } from '@tile/entity/zone';

/**
 * The long swell of a surface, the crests and hollows a wheel feels far apart (functional spec
 * 2.3). The ground itself stays flat, mesh and collider alike: the swell is a field the car reads
 * under its wheels and the mesh only lights, so what looks rough is what drives rough. A road is
 * flat, a landscape heaves by a good ten centimetres, enough to cost time and grip at speed.
 */
export interface Swell {
  /** How far a crest rises over the flat, in metres; 0 for a ground with no swell at all. */
  height: number;
  /** The field's step in metres, so crest to crest is about twice it, as for the grain. */
  length: number;
}

/**
 * What the caller of the tile answers about a zone rank of its environment: the swell to shade
 * it with, or null to leave it flat. The per-surface table lives in `car` (technical spec 4.2),
 * so the answer comes down from whoever holds both, and a tile drawn without one is just flat.
 */
export interface SwellProbe {
  of(zone: Zone, type: number): Swell | null;
}
