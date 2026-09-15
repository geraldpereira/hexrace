/** Rally: the whole vocabulary of tiles on one track, on a road wide enough for the North. */
export const CATALOG_FILE = `hexrace-track 1

id: north-catalog-01
name: Catalog
environment: north  # North
mode: rally

# One line per tile, in the order of travel. The entry face is always 6.
# exit exit face · pos/w road position and width at the exit · sh shoulders left,right
# h height in steps · t road/shoulder/landscape ranks · obs obstacles (see obstacle-text.ts)

[tiles]
start  exit=12  pos=3  w=3  sh=1,1  h=32  t=1/1/1
       exit=12  pos=3  w=3  sh=1,1  h=40  t=1/1/1
       exit=12  pos=2  w=3  sh=1,1  h=48  t=1/1/1
       exit=2   pos=3  w=3  sh=1,1  h=56  t=1/1/1
       exit=4   pos=2  w=3  sh=1,1  h=56  t=1/1/1
       exit=12  pos=2  w=3  sh=1,1  h=56  t=1/1/1
       exit=10  pos=2  w=3  sh=1,1  h=56  t=1/1/1
       exit=8   pos=3  w=3  sh=1,1  h=56  t=1/1/1
       exit=12  pos=3  w=3  sh=1,1  h=56  t=1/1/1
       exit=4   pos=3  w=3  sh=1,1  h=56  t=1/1/1
       exit=2   pos=3  w=3  sh=1,1  h=56  t=1/1/1
       exit=8   pos=3  w=3  sh=1,1  h=56  t=1/1/1
       exit=10  pos=3  w=3  sh=1,1  h=48  t=1/1/1
       exit=12  pos=3  w=3  sh=1,1  h=32  t=1/1/1
       exit=4   pos=3  w=3  sh=1,1  h=32  t=1/1/1
       exit=8   pos=3  w=3  sh=1,1  h=32  t=1/1/1
       exit=12  pos=3  w=3  sh=1,1  h=32  t=1/1/1
`;
