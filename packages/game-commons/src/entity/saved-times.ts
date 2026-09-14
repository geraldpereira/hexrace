/** Where the best times live in the browser, version in the key (technical spec 9.1). */
export const BEST_TIMES_KEY = 'hexrace.best.v1';

/**
 * The saved best times (functional spec 6.1): the best total time of each track, in milliseconds,
 * by track id. Nothing else is kept, and an unreadable document is thrown away rather than
 * migrated, as long as the game is not deployed.
 */
export interface SavedTimes {
  readonly tracks: Readonly<Record<string, number>>;
}
