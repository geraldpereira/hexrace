import { Killer, Log, Silent } from '@engine/scene/game-component.mock';
import { GameObject } from '@engine/scene/game-object';

describe('GameObject', () => {
  beforeEach(() => {
    Log.events.length = 0;
  });

  it('wakes a component when added and finds it by class', () => {
    const go = GameObject.named('car');
    const c = go.add(Log.named('a'));
    go.add(new Silent());
    expect(c.gameObject).toBe(go);
    expect(Log.events).toEqual(['awake a']);
    expect(go.get(Log)).toBe(c);
    expect(go.getOrThrow(Silent)).toBeInstanceOf(Silent);
    expect(() => GameObject.named('empty').getOrThrow(Log)).toThrow('missing Log');
  });

  it('builds a tree and searches it depth first', () => {
    const root = GameObject.named('root');
    const child = root.addChild(GameObject.named('child'));
    const grandChild = child.addChild(GameObject.named('grandChild'));
    child.add(new Silent());
    const a = grandChild.add(Log.named('a'));
    const b = root.addChild(GameObject.named('other')).add(Log.named('b'));
    expect(grandChild.root()).toBe(root);
    expect(root.findInChildren(Log)).toBe(a);
    expect(root.findInChildren(Killer)).toBeUndefined();
    expect(grandChild.findInScene(Log)).toBe(a);
    expect(grandChild.findAllInScene(Log)).toEqual([a, b]);
    expect(child.findInChildren(Log)).toBe(a);
    expect(() => child.addChild(grandChild)).toThrow('already has a parent');
  });

  it('starts every component once, then ticks parents before children', () => {
    const root = GameObject.named('root');
    root.add(Log.named('root'));
    root.addChild(GameObject.named('child')).add(Log.named('child'));
    root.startAll();
    root.startAll();
    root.fixedUpdate();
    root.render(0.5);
    expect(Log.events).toEqual([
      'awake root',
      'awake child',
      'start root',
      'start child',
      'fixed root',
      'fixed child',
      'render root 0.5',
      'render child 0.5',
    ]);
  });

  it('destroys the subtree, children first, and detaches it', () => {
    const root = GameObject.named('root');
    const child = root.addChild(GameObject.named('child'));
    child.add(Log.named('child'));
    child.addChild(GameObject.named('grandChild')).add(Log.named('grandChild'));
    root.add(Log.named('root'));
    Log.events.length = 0;
    child.destroy();
    child.destroy();
    expect(Log.events).toEqual(['destroy grandChild', 'destroy child']);
    expect(root.children).toEqual([]);
    expect(child.parent).toBeNull();
    child.fixedUpdate();
    child.render(1);
    expect(Log.events).toHaveLength(2);
  });

  it('skips a sibling destroyed during the tick', () => {
    const root = GameObject.named('root');
    const victim = GameObject.named('victim');
    victim.add(Log.named('victim'));
    const killer = new Killer();
    killer.victim = victim;
    root.addChild(GameObject.named('killer')).add(killer);
    root.addChild(victim);
    Log.events.length = 0;
    root.fixedUpdate();
    expect(Log.events).toEqual(['destroy victim']);
    const victim2 = GameObject.named('victim2');
    victim2.add(Log.named('victim2'));
    killer.victim = victim2;
    root.addChild(victim2);
    Log.events.length = 0;
    root.render(1);
    expect(Log.events).toEqual(['destroy victim2']);
  });

  it('dispatches a collision to every component', () => {
    const go = GameObject.named('car');
    go.add(Log.named('a'));
    go.add(new Silent());
    go.dispatchCollisionEnter(GameObject.named('wall'));
    expect(Log.events).toEqual(['awake a', 'hit a by wall']);
  });
});
