import { getAdjacentId } from '../channelOrder';

describe('getAdjacentId', () => {
  const ids = ['1', '2', '3'];

  it('steps forward and back inside the list', () => {
    expect(getAdjacentId(ids, '2', 1)).toBe('3');
    expect(getAdjacentId(ids, '2', -1)).toBe('1');
  });

  it('wraps around both ends by default', () => {
    expect(getAdjacentId(ids, '3', 1)).toBe('1');
    expect(getAdjacentId(ids, '1', -1)).toBe('3');
  });

  it('stops at the ends when wrap is off', () => {
    expect(getAdjacentId(ids, '3', 1, false)).toBeUndefined();
    expect(getAdjacentId(ids, '1', -1, false)).toBeUndefined();
  });

  it('returns nothing when the id is not in the list', () => {
    expect(getAdjacentId(ids, '9', 1)).toBeUndefined();
  });

  it('returns nothing when there is no other channel to go to', () => {
    expect(getAdjacentId([], '1', 1)).toBeUndefined();
    expect(getAdjacentId(['1'], '1', 1)).toBeUndefined();
  });
});
