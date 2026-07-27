/**
 * Behavior tests for the EPG row's expand/play split — the invariants that keep
 * "tap to read" from colliding with "tap to watch":
 *   • expandable (mobile): the body toggles, the glyph plays — never swapped
 *   • collapsed clamps the description to 1 line, expanded un-clamps it so the
 *     row height flows from the text (any number of lines)
 *   • a future/`scheduled` row is still expandable but exposes no play target
 *   • WITHOUT `onToggleExpand` the row is byte-identical to before: the whole
 *     row plays (the search call site depends on this)
 *   • `recycled` (virtualized/FlashList parents) only suppresses animation —
 *     it must never change the press split or the clamping
 *
 * `expanded` is parent-owned, so these render it as a controlled prop — the
 * component must never hold its own copy.
 */
import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react-native';

import ProgramRow from '../ProgramRow';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// The SVG glyphs are native/transformer-backed — the unit under test is the
// press split and the text clamping, not the artwork.
jest.mock('@/components/Icons', () => ({
  Icon: () => null,
}));

jest.mock('expo-blur', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native') as typeof import('react-native');
  return { BlurView: RN.View };
});

const DESCRIPTION = 'Përmbledhja e ngjarjeve kryesore të ditës, me analiza dhe intervista në studio.';

const setup = (props: Partial<React.ComponentProps<typeof ProgramRow>> = {}) => {
  const onPress = jest.fn();
  const onToggleExpand = jest.fn();
  render(
    <ProgramRow
      title="Lajmet e Ditës"
      meta={DESCRIPTION}
      time="21:30"
      onPress={onPress}
      onToggleExpand={onToggleExpand}
      testID="row"
      {...props}
    />,
  );
  return { onPress, onToggleExpand };
};

/** The description is the row's second text node — the first is the title. */
const descriptionNode = () => screen.getAllByText(DESCRIPTION)[0];

describe('ProgramRow — expandable', () => {
  it('pressing the row body toggles expansion and does NOT start playback', () => {
    const { onPress, onToggleExpand } = setup();

    fireEvent.press(screen.getByTestId('row'));

    expect(onToggleExpand).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('pressing the play glyph starts playback and does NOT toggle expansion', () => {
    const { onPress, onToggleExpand } = setup();

    fireEvent.press(screen.getByTestId('row-play'));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onToggleExpand).not.toHaveBeenCalled();
  });

  it('clamps the description to one line while collapsed', () => {
    setup({ expanded: false });

    expect(descriptionNode().props.numberOfLines).toBe(1);
  });

  it('un-clamps the description when expanded so the row fits its content', () => {
    setup({ expanded: true });

    // undefined = React Native's unlimited default: the text wraps to as many
    // lines as it needs and the row grows with it.
    expect(descriptionNode().props.numberOfLines).toBeUndefined();
  });

  it('reports its expanded state to assistive tech', () => {
    setup({ expanded: true });

    expect(screen.getByTestId('row').props.accessibilityState).toMatchObject({ expanded: true });
  });
});

describe('ProgramRow — scheduled (future programme)', () => {
  it('is expandable but exposes no play target', () => {
    const { onToggleExpand } = setup({ state: 'scheduled' });

    expect(screen.queryByTestId('row-play')).toBeNull();

    fireEvent.press(screen.getByTestId('row'));
    expect(onToggleExpand).toHaveBeenCalledTimes(1);
  });

  it('still un-clamps its description when expanded', () => {
    setup({ state: 'scheduled', expanded: true });

    expect(descriptionNode().props.numberOfLines).toBeUndefined();
  });
});

describe('ProgramRow — recycled (virtualized list call sites)', () => {
  // `recycled` exists purely to suppress the height/chevron animations that a
  // FlashList cell reuse would otherwise play as a flicker. It must stay a
  // rendering concern only — if it ever starts gating the press split or the
  // clamping, the radio schedule silently loses expand-to-read.
  it('leaves the expand/play split intact', () => {
    const { onPress, onToggleExpand } = setup({ recycled: true });

    fireEvent.press(screen.getByTestId('row'));
    expect(onToggleExpand).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('row-play'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('still clamps collapsed and un-clamps expanded', () => {
    setup({ recycled: true });
    expect(descriptionNode().props.numberOfLines).toBe(1);

    screen.rerender(
      <ProgramRow
        recycled
        title="Lajmet e Ditës"
        meta={DESCRIPTION}
        time="21:30"
        expanded
        onPress={jest.fn()}
        onToggleExpand={jest.fn()}
        testID="row"
      />,
    );
    expect(descriptionNode().props.numberOfLines).toBeUndefined();
  });
});

describe('ProgramRow — non-expandable (search call site)', () => {
  it('plays from the whole row and renders no separate play target', () => {
    const { onPress } = setup({ onToggleExpand: undefined });

    expect(screen.queryByTestId('row-play')).toBeNull();

    fireEvent.press(screen.getByTestId('row'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('keeps the meta line clamped even if `expanded` is passed', () => {
    setup({ onToggleExpand: undefined, expanded: true });

    expect(descriptionNode().props.numberOfLines).toBe(1);
  });

  it('stays non-pressable when scheduled', () => {
    const { onPress } = setup({ onToggleExpand: undefined, state: 'scheduled' });

    fireEvent.press(screen.getByTestId('row'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
