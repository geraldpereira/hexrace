/** Rally: every road, shoulder and landscape rank of Europe, in falling order of grip. */
export const SURFACES_FILE = `hexrace-track 1

id: europe-surfaces-01
name: Surfaces
environment: europe  # Europe
mode: rally

# One line per tile, in the order of travel. The entry face is always 6.
# exit exit face · pos/w road position and width at the exit · sh shoulders left,right
# h height in steps · t road/shoulder/landscape ranks · obs obstacles (see obstacle-text.ts)

[tiles]
start  exit=12  pos=2  w=3  sh=1,1  h=40  t=1/1/1
       exit=12  pos=2  w=3  sh=1,1  h=40  t=1/1/1
       exit=2   pos=2  w=3  sh=1,1  h=40  t=2/1/1
       exit=12  pos=2  w=3  sh=1,1  h=40  t=2/1/1
       exit=10  pos=2  w=3  sh=1,1  h=40  t=3/1/1
       exit=12  pos=2  w=3  sh=1,1  h=40  t=3/1/1
       exit=12  pos=2  w=3  sh=1,1  h=40  t=3/2/1
       exit=2   pos=2  w=3  sh=1,1  h=40  t=3/2/1
       exit=12  pos=2  w=3  sh=1,1  h=40  t=3/3/1
       exit=10  pos=2  w=3  sh=1,1  h=40  t=3/3/1
       exit=12  pos=2  w=3  sh=1,1  h=40  t=3/3/2
       exit=12  pos=2  w=3  sh=1,1  h=40  t=3/3/2
`;

/** Rally: the North on a descent, the road narrowing and its shoulders leaving one by one. */
export const BORDERS_FILE = `hexrace-track 1

id: north-borders-01
name: Borders
environment: north  # North
mode: rally

# One line per tile, in the order of travel. The entry face is always 6.
# exit exit face · pos/w road position and width at the exit · sh shoulders left,right
# h height in steps · t road/shoulder/landscape ranks · obs obstacles (see obstacle-text.ts)

[tiles]
start  exit=12  pos=2  w=4  sh=1,1  h=150  t=1/1/1
       exit=12  pos=2  w=4  sh=1,1  h=138  t=1/1/1
       exit=2   pos=2  w=4  sh=1,1  h=126  t=2/1/1
       exit=12  pos=2  w=3  sh=1,1  h=114  t=2/1/1
       exit=10  pos=2  w=3  sh=1,0  h=102  t=2/2/1
       exit=12  pos=2  w=3  sh=1,0  h=90  t=3/2/1
       exit=12  pos=3  w=3  sh=1,0  h=78  t=3/2/1
       exit=2   pos=3  w=3  sh=0,0  h=66  t=3/3/1
       exit=12  pos=3  w=3  sh=0,0  h=54  t=3/3/2
       exit=10  pos=3  w=3  sh=0,0  h=42  t=3/3/2
       exit=12  pos=3  w=3  sh=0,0  h=30  t=3/3/2
       exit=12  pos=3  w=3  sh=0,0  h=18  t=3/3/2
`;

/** Rally: Africa bending, wide turns then hairpins, to read the landscape through a curve. */
export const BENDS_FILE = `hexrace-track 1

id: africa-bends-01
name: Bends
environment: africa  # Africa
mode: rally

# One line per tile, in the order of travel. The entry face is always 6.
# exit exit face · pos/w road position and width at the exit · sh shoulders left,right
# h height in steps · t road/shoulder/landscape ranks · obs obstacles (see obstacle-text.ts)

[tiles]
start  exit=12  pos=2  w=3  sh=1,1  h=30  t=1/1/1
       exit=2   pos=2  w=3  sh=1,1  h=30  t=1/1/1
       exit=2   pos=2  w=3  sh=1,1  h=30  t=2/1/1
       exit=10  pos=2  w=3  sh=1,1  h=30  t=2/1/1
       exit=10  pos=2  w=3  sh=1,1  h=30  t=2/2/1
       exit=12  pos=2  w=3  sh=1,1  h=30  t=3/2/1
       exit=4   pos=2  w=3  sh=1,1  h=30  t=3/2/2
       exit=12  pos=2  w=3  sh=1,1  h=30  t=3/3/2
       exit=8   pos=2  w=3  sh=1,1  h=30  t=3/3/2
       exit=12  pos=2  w=3  sh=1,1  h=30  t=3/3/2
       exit=12  pos=2  w=3  sh=1,1  h=30  t=3/3/2
`;
