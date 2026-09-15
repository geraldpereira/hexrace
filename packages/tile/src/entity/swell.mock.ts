import { type Swell, type SwellProbe } from '@tile/entity/swell';
import { type Zone } from '@tile/entity/zone';

export const ROLLING: Swell = { height: 0.12, length: 6 };

export const swellProbe: SwellProbe = {
  of: (zone: Zone) => (zone === 'landscape' ? ROLLING : { height: 0, length: 6 }),
};
