/** Closes on three hairpins, but a start tile may not be a hairpin (spec 2.5). */
export const TRIANGLE_FILE = `hexrace-track 1

id: africa-triangle-01
name: Triangle
environment: africa  # Africa
mode: track

# One line per tile, in the order of travel. The entry face is always 6.
# exit exit face · pos/w road position and width at the exit · sh shoulders left,right
# h height in steps · t road/shoulder/landscape ranks · obs obstacles (see obstacle-text.ts)

[tiles]
start  exit=4   pos=3  w=2  sh=1,1  h=24  t=2/2/2
       exit=4   pos=3  w=2  sh=1,1  h=30  t=2/2/2
       exit=4   pos=3  w=2  sh=1,1  h=24  t=2/2/2
`;

/** Six wide left turns around one tile: the smallest valid loop. */
export const HEXAGON_FILE = `hexrace-track 1

id: north-ring-01
name: Hexagon
environment: north  # North
mode: track

# One line per tile, in the order of travel. The entry face is always 6.
# exit exit face · pos/w road position and width at the exit · sh shoulders left,right
# h height in steps · t road/shoulder/landscape ranks · obs obstacles (see obstacle-text.ts)

[tiles]
start  exit=10  pos=3  w=3  sh=1,1  h=24  t=2/2/2
       exit=10  pos=3  w=3  sh=1,1  h=32  t=2/2/2
       exit=10  pos=3  w=3  sh=1,1  h=32  t=2/2/2
       exit=10  pos=3  w=3  sh=1,1  h=24  t=2/2/2
       exit=10  pos=2  w=3  sh=1,1  h=24  t=2/2/2
       exit=10  pos=3  w=3  sh=1,1  h=24  t=2/2/2
`;

/** A straight Rally narrowing from four units to two in the middle, and the steepest legal climb. */
export const STRAIGHT_LINE_FILE = `hexrace-track 1

id: europe-line-01
name: Straight Line
environment: europe  # Europe
mode: rally

# One line per tile, in the order of travel. The entry face is always 6.
# exit exit face · pos/w road position and width at the exit · sh shoulders left,right
# h height in steps · t road/shoulder/landscape ranks · obs obstacles (see obstacle-text.ts)

[tiles]
start  exit=12  pos=2  w=4  sh=1,1  h=24  t=2/2/2
       exit=12  pos=4  w=2  sh=0,1  h=32  t=2/2/2
       exit=12  pos=2  w=4  sh=1,1  h=55  t=2/2/2
       exit=12  pos=2  w=4  sh=1,1  h=55  t=2/2/2
`;

/** Six wide turns then a straight: the seventh tile lands on the first. */
export const OVERLAP_FILE = `hexrace-track 1

id: europe-overlap-01
name: Overlap
environment: europe  # Europe
mode: rally

# One line per tile, in the order of travel. The entry face is always 6.
# exit exit face · pos/w road position and width at the exit · sh shoulders left,right
# h height in steps · t road/shoulder/landscape ranks · obs obstacles (see obstacle-text.ts)

[tiles]
start  exit=2   pos=3  w=2  sh=1,1  h=24  t=2/2/2
       exit=2   pos=3  w=2  sh=1,1  h=24  t=2/2/2
       exit=2   pos=3  w=2  sh=1,1  h=24  t=2/2/2
       exit=2   pos=3  w=2  sh=1,1  h=24  t=2/2/2
       exit=2   pos=3  w=2  sh=1,1  h=24  t=2/2/2
       exit=2   pos=3  w=2  sh=1,1  h=24  t=2/2/2
       exit=12  pos=3  w=2  sh=1,1  h=24  t=2/2/2
`;

/** A straight to judge relief alone: a steady climb, a crest, a hollow. */
export const RELIEF_FILE = `hexrace-track 1

id: europe-relief-01
name: Relief
environment: europe  # Europe
mode: rally

# One line per tile, in the order of travel. The entry face is always 6.
# exit exit face · pos/w road position and width at the exit · sh shoulders left,right
# h height in steps · t road/shoulder/landscape ranks · obs obstacles (see obstacle-text.ts)

[tiles]
start  exit=12  pos=3  w=2  sh=1,1  h=24  t=1/2/2
       exit=12  pos=3  w=2  sh=1,1  h=32  t=1/2/2
       exit=12  pos=3  w=2  sh=1,1  h=40  t=1/2/2
       exit=12  pos=3  w=2  sh=1,1  h=48  t=1/2/2
       exit=12  pos=3  w=2  sh=1,1  h=40  t=2/2/2
       exit=12  pos=3  w=2  sh=1,1  h=32  t=2/2/2
       exit=12  pos=3  w=2  sh=1,1  h=32  t=2/2/2
       exit=12  pos=3  w=2  sh=1,1  h=40  t=2/2/2
       exit=12  pos=3  w=2  sh=1,1  h=40  t=2/2/2
`;

/** Deliberately faulty: no landscape on the left, a hazard spilling out, laps in Rally. */
export const INVALID_FILE = `hexrace-track 1

id: europe-invalid-01
name: Invalid
environment: europe  # Europe
mode: rally
laps: 2

# One line per tile, in the order of travel. The entry face is always 6.
# exit exit face · pos/w road position and width at the exit · sh shoulders left,right
# h height in steps · t road/shoulder/landscape ranks · obs obstacles (see obstacle-text.ts)

[tiles]
start  exit=12  pos=3  w=2  sh=1,1  h=24  t=2/2/2
       exit=2   pos=1  w=2  sh=1,1  h=24  t=2/2/2
       exit=12  pos=3  w=2  sh=1,1  h=24  t=2/2/2  obs=hazard:large@0.05/3
       exit=12  pos=3  w=2  sh=1,1  h=24  t=2/2/2
`;
