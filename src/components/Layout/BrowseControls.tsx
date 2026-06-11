/**
 * BrowseControls — the shared browse header: a search entry + a segmented
 * toggle (e.g. Televizion / Radio). One global component so the search field and
 * the toggle are pixel-identical across every screen that browses content.
 *
 * Render it PINNED (outside a list's `ListHeaderComponent`): the Home grid
 * re-keys its FlashList when the column count changes between modes, which would
 * remount — and visually jolt — anything inside the list header. Kept pinned
 * above the list, the search + toggle stay put while only the content swaps.
 *
 * Generic over the toggle value so it's reusable beyond TV/Radio.
 */
import { StyleSheet, View } from 'react-native';

import { SPACING } from '@/theme/spacing';
import { SearchBar, SegmentedToggle } from '@/components/Inputs';
import type { SegmentedToggleOption } from '@/components/Inputs/SegmentedToggle';

export interface BrowseControlsProps<T extends string> {
  searchPlaceholder: string;
  /** Button mode (navigate to search). Omit when using `searchValue`/`onSearchChange`. */
  onSearchPress?: () => void;
  /** Input mode (live value). */
  searchValue?: string;
  onSearchChange?: (next: string) => void;
  toggleOptions: SegmentedToggleOption<T>[];
  toggleValue: T;
  onToggleChange: (value: T) => void;
  testID?: string;
}

function BrowseControls<T extends string>({
  searchPlaceholder,
  onSearchPress,
  searchValue,
  onSearchChange,
  toggleOptions,
  toggleValue,
  onToggleChange,
  testID,
}: BrowseControlsProps<T>) {
  return (
    <View style={styles.container} testID={testID}>
      <SearchBar
        placeholder={searchPlaceholder}
        value={searchValue}
        onChangeText={onSearchChange}
        onPress={onSearchPress}
        testID={testID ? `${testID}-search` : undefined}
      />
      <SegmentedToggle
        options={toggleOptions}
        value={toggleValue}
        onChange={onToggleChange}
        testID={testID ? `${testID}-toggle` : undefined}
      />
    </View>
  );
}

export default BrowseControls;

const styles = StyleSheet.create({
  container: {
    gap: SPACING.space_12,
    paddingHorizontal: SPACING.space_18,
    paddingTop: SPACING.space_4,
    paddingBottom: SPACING.space_12,
  },
});
