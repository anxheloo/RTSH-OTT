/**
 * Search (Kërko) — design screen 8. Shares the brand header with Home (logo
 * taps back to Kreu); the live search field sits below it, mirroring Home's
 * browse controls. Results render as two list sections (Kanale rows, Programe
 * rows) filtered client-side as the debounced query settles. With no query,
 * shows recent searches as tappable chips. Programs are drawn from today's EPG
 * until a backend search endpoint lands — `useSearch`'s debounce already
 * rate-limits the query for that swap.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { router } from 'expo-router';

import { SCREEN_PADDING, SPACING } from '@/theme/spacing';
import { useAppStore } from '@/store/useAppStore';
import { useChannelsQuery, useEpgQuery } from '@/api/queries';
import { useDateTime } from '@/hooks/useDateTime';
import { useSearch } from '@/hooks/useSearch';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { BrandHeader } from '@/components/Brand';
import { SearchResultRow } from '@/components/channels';
import { ProgramRow } from '@/components/epg';
import { Icon, IconButton } from '@/components/Icons';
import { SearchBar } from '@/components/Inputs';
import ReusableText from '@/components/Inputs/ReusableText';
import { ScreenLayout, SectionHeader } from '@/components/Layout';
import { ProfileIcon } from '@/assets/icons';
import { PACKAGE_LABEL } from '@/constants/packages';

const MAX_RECENT = 8;
const MAX_PROGRAM_RESULTS = 20;

const SearchScreen: React.FC = () => {
  const { t } = useTranslation();
  const colors = useAppStore((s) => s.colors);
  const tabBarHeight = useTabBarHeight();
  const { formatTime } = useDateTime();
  const { query, debouncedQuery, setQuery } = useSearch();
  const [recent, setRecent] = useState<string[]>([]);

  const { channels } = useChannelsQuery();
  const { items: epg } = useEpgQuery();

  const needle = debouncedQuery.trim().toLowerCase();
  const hasQuery = needle.length > 0;

  const channelResults = useMemo(
    () => (hasQuery ? channels.filter((c) => c.name.toLowerCase().includes(needle)) : []),
    [channels, needle, hasQuery],
  );

  const programResults = useMemo(
    () =>
      hasQuery
        ? epg.filter((e) => e.title.toLowerCase().includes(needle)).slice(0, MAX_PROGRAM_RESULTS)
        : [],
    [epg, needle, hasQuery],
  );

  const hasResults = channelResults.length > 0 || programResults.length > 0;

  const openChannel = (id: string) => router.push(`/(app)/channel/${id}`);

  const commitSearch = useCallback(() => {
    const term = query.trim();
    if (!term) return;
    setRecent((prev) =>
      [term, ...prev.filter((x) => x.toLowerCase() !== term.toLowerCase())].slice(0, MAX_RECENT),
    );
  }, [query]);

  return (
    <ScreenLayout>
      <BrandHeader
        testID="search-header"
        onLogoPress={() => router.navigate('/(app)/(tabs)')}
        rightSlot={
          <IconButton
            size={40}
            backgroundColor={colors.surface}
            onPress={() => router.push('/(app)/(tabs)/profile')}
            accessibilityLabel="Profili"
            testID="search-profile-btn"
          >
            <Icon as={ProfileIcon} size={20} color={colors.text} />
          </IconButton>
        }
      />

      <View style={styles.searchWrap}>
        <SearchBar
          placeholder={t('home.search_placeholder')}
          value={query}
          onChangeText={setQuery}
          onSubmit={commitSearch}
          autoFocus
          testID="search-input"
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: tabBarHeight + SPACING.space_24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!hasQuery ? (
          recent.length > 0 ? (
            <>
              <SectionHeader title={t('search.recent')} />
              <View style={styles.chips}>
                {recent.map((term) => (
                  <ReusableText
                    key={term}
                    variant="bodySmall"
                    themeColor="textMuted"
                    onPress={() => setQuery(term)}
                    style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    testID={`search-recent-${term}`}
                  >
                    {term}
                  </ReusableText>
                ))}
              </View>
            </>
          ) : null
        ) : !hasResults ? (
          <ReusableText variant="body" themeColor="textMuted" style={styles.empty}>
            {t('search.no_results', { query: debouncedQuery.trim() })}
          </ReusableText>
        ) : (
          <>
            {channelResults.length > 0 ? (
              <>
                <SectionHeader title={t('search.channels')} />
                {channelResults.map((c) => (
                  <SearchResultRow
                    key={c.id}
                    name={c.name}
                    meta={`TV · ${PACKAGE_LABEL[c.package]}`}
                    thumbnailUri={c.thumbnailUrl}
                    onPress={() => openChannel(c.id)}
                    testID={`search-channel-${c.id}`}
                  />
                ))}
              </>
            ) : null}

            {programResults.length > 0 ? (
              <>
                <SectionHeader title={t('search.programs')} />
                {programResults.map((p) => (
                  <ProgramRow
                    key={p.id}
                    title={p.title}
                    meta={`${p.channelName} · ${formatTime(p.startTime)}`}
                    onPress={() => openChannel(p.channelId)}
                    testID={`search-program-${p.id}`}
                  />
                ))}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </ScreenLayout>
  );
};

export default SearchScreen;

const styles = StyleSheet.create({
  searchWrap: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: SPACING.space_4,
    paddingBottom: SPACING.space_12,
  },
  body: {
    paddingBottom: SPACING.space_24,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.space_8,
    paddingHorizontal: SCREEN_PADDING,
  },
  chip: {
    paddingHorizontal: SPACING.space_15,
    paddingVertical: SPACING.space_8,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  empty: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: SPACING.space_24,
    textAlign: 'center',
  },
});
