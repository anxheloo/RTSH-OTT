/**
 * CityPickerInput — the searchable city sheet, scoped to `country`. Disabled
 * until a country is chosen, so a city can only ever come from the selected
 * country's list (`getCitiesForCountry`), or the pinned "Other" option. The
 * parent clears the value when the country changes.
 */
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { CITY_OTHER, getCitiesForCountry } from '@/constants/cities';

import SearchablePickerInput from './SearchablePickerInput';

export interface CityPickerInputProps {
  /** Selected country's English name; empty disables the picker. */
  country: string;
  value: string;
  onChange: (city: string) => void;
  label?: string;
  placeholder?: string;
  /** Shown in the field while no country is selected. */
  disabledPlaceholder?: string;
  errorText?: string;
  testID?: string;
}

const CityPickerInput: React.FC<CityPickerInputProps> = ({
  country,
  placeholder,
  disabledPlaceholder,
  ...rest
}) => {
  const { t } = useTranslation();
  const options = useMemo(
    () =>
      country
        ? [
            // Pinned first so someone whose town isn't listed never picks a wrong one.
            { value: CITY_OTHER, label: t('auth.register.city_other'), pinned: true },
            ...getCitiesForCountry(country).map((city) => ({ value: city })),
          ]
        : [],
    [country, t],
  );

  return (
    <SearchablePickerInput
      {...rest}
      options={options}
      disabled={!country}
      placeholder={country ? placeholder : (disabledPlaceholder ?? placeholder)}
    />
  );
};

export default CityPickerInput;
