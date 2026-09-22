/**
 * CountryPickerInput — the searchable country sheet over the static
 * `COUNTRIES` dataset. The stored value is the English common name (the
 * backend payload); flags are emoji derived from the ISO code, so there are
 * no image assets.
 */
import React from 'react';

import { GlobeIcon } from '@/assets/icons';
import { COUNTRIES, countryFlag } from '@/constants/countries';

import SearchablePickerInput, { type PickerOption } from './SearchablePickerInput';

export interface CountryPickerInputProps {
  value: string;
  onChange: (countryName: string) => void;
  label?: string;
  placeholder?: string;
  errorText?: string;
  testID?: string;
}

const COUNTRY_OPTIONS: readonly PickerOption[] = COUNTRIES.map((c) => ({
  value: c.name,
  leading: countryFlag(c.code),
}));

const CountryPickerInput: React.FC<CountryPickerInputProps> = ({
  placeholder = 'Zgjidh shtetin',
  ...rest
}) => (
  <SearchablePickerInput
    {...rest}
    options={COUNTRY_OPTIONS}
    icon={GlobeIcon}
    placeholder={placeholder}
  />
);

export default CountryPickerInput;
