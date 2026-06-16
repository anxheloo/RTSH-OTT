/**
 * SearchBar — pill search field (design `searchbar`). Two modes:
 *  - **button** (pass `onPress`, no `onChangeText`): a pressable placeholder row
 *    that navigates to the search screen (Home).
 *  - **input** (pass `value` + `onChangeText`): a live text field (Search screen).
 * Theme-tokened; leading search glyph recolors from the muted token.
 */
import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { BORDERRADIUS } from '@/theme/borders';
import { FONTSIZE } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { Icon } from '@/components/Icons';
import { SearchIcon } from '@/assets/icons';

import ReusableText from './ReusableText';

export interface SearchBarProps {
  placeholder: string;
  /** Live value (input mode). */
  value?: string;
  /** Change handler (input mode). When omitted, the bar is a pressable button. */
  onChangeText?: (next: string) => void;
  /** Press handler (button mode → navigate to search). */
  onPress?: () => void;
  /** Fired on the keyboard "search" return key (input mode). */
  onSubmit?: () => void;
  autoFocus?: boolean;
  testID?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder,
  value,
  onChangeText,
  onPress,
  onSubmit,
  autoFocus,
  testID,
}) => {
  const colors = useAppStore((s) => s.colors);
  const isButton = !onChangeText;

  const frame = [styles.bar, { backgroundColor: colors.surface, borderColor: colors.border }];

  const glyph = <Icon as={SearchIcon} size={19} color={colors.textMuted} />;

  if (isButton) {
    return (
      <TouchableOpacity
        style={frame}
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={placeholder}
        testID={testID}
      >
        {glyph}
        <ReusableText variant="body" themeColor="textMuted" style={styles.flex}>
          {placeholder}
        </ReusableText>
      </TouchableOpacity>
    );
  }

  return (
    <View style={frame} testID={testID}>
      {glyph}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoFocus={autoFocus}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        style={[styles.flex, styles.input, { color: colors.text }]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.space_10,
    height: 48,
    paddingHorizontal: SPACING.space_16,
    borderWidth: 1,
    borderRadius: BORDERRADIUS.pill_input,
  },
  flex: {
    flex: 1,
  },
  input: {
    padding: 0,
    fontSize: FONTSIZE.md,
  },
});

export default SearchBar;
