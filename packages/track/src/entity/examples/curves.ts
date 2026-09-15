/** Rally: turns that tighten and open, a chicane, a climb and a descent. */
export const CURVES_FILE = `hexrace-track 1

id: europe-curves-01
name: Curves
environment: europe  # Europe
mode: rally

# One line per tile, in the order of travel. The entry face is always 6.
# exit exit face · pos/w road position and width at the exit · sh shoulders left,right
# h height in steps · t road/shoulder/landscape ranks · obs obstacles (see obstacle-text.ts)

[tiles]
start  exit=12  pos=2  w=2  sh=1,1  h=24  t=1/1/1
       exit=2   pos=4  w=2  sh=1,1  h=24  t=1/1/1
       exit=2   pos=4  w=2  sh=1,1  h=24  t=1/1/1
       exit=2   pos=2  w=2  sh=1,1  h=24  t=1/1/1
       exit=12  pos=2  w=2  sh=1,1  h=24  t=1/1/1
       exit=10  pos=2  w=2  sh=1,1  h=24  t=1/1/1
       exit=10  pos=4  w=2  sh=1,1  h=24  t=1/1/1
       exit=10  pos=4  w=2  sh=1,1  h=24  t=1/1/1
       exit=12  pos=2  w=2  sh=1,1  h=24  t=1/1/1
       exit=2   pos=2  w=2  sh=1,1  h=32  t=1/1/1
       exit=2   pos=2  w=2  sh=1,1  h=40  t=1/1/1
       exit=12  pos=3  w=2  sh=1,1  h=48  t=1/1/1
       exit=10  pos=3  w=2  sh=1,1  h=48  t=1/1/1
       exit=2   pos=3  w=2  sh=1,1  h=48  t=1/1/1
       exit=12  pos=2  w=2  sh=1,1  h=48  t=1/1/1
       exit=10  pos=3  w=2  sh=1,1  h=40  t=1/1/1
       exit=10  pos=4  w=2  sh=1,1  h=32  t=1/1/1
       exit=10  pos=4  w=2  sh=1,1  h=24  t=1/1/1
       exit=12  pos=4  w=2  sh=1,1  h=24  t=1/1/1
`;
