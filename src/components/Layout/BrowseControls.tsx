/**
 * BrowseControls — the shared browse header: a search entry + a segmented
 * toggle (e.g. Televizion / Radio). One global component so the search field and
 * the toggle are pixel-identical across every screen that browses content.
 *
 * Designed to ride inside a list's `ListHeaderComponent` so it scrolls up with
 * the content (not pinned). For that to be jolt-free the host list must NOT
 * re-key on mode switch — Home keeps a constant column count (TV rows are
 * pre-chunked into pairs) so the header stays mounted across the toggle.
 *
 * Generic over the toggle value so it's reusable beyond TV/Radio.
 */
import { StyleSheet, View } from 'react-native';

import { SCREEN_PADDING, SPACING } from '@/theme/spacing';
import { SearchBar, SegmentedToggle } from '@/components/Inputs';
import type { SegmentedToggleOption } from '@/components/Inputs/SegmentedToggle';

export interface BrowseControlsProps<T extends string> {
  searchPlaceholder: string;
  /** Button mode (navigate to search). Omit when using `searchValue`/`onSearchChange`. */
  onSearchPress?: () => void;
  /** Input mode (live value). */
  searchValue?: string;
  onSearchChange?: (next: string) => void;
  autoFocus?: boolean;
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
  autoFocus,
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
        autoFocus={autoFocus}
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

const styles = StyleSheet.create({
  container: {
    gap: SPACING.space_12,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: SPACING.space_4,
    paddingBottom: SPACING.space_12,
  },
});

export default BrowseControls;
