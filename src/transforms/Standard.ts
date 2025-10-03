import { Standard } from '@/models';
import _ from 'lodash';
import { Item } from 'react-native-picker-select';

export const fromStandardsToCustomPickers = (stds: Standard[]) =>
  _.map(
    stds,
    std => ({ label: std.standardname, value: std.standardid } as Item),
  );

export const toCustomPickerItems = (
  items: Record<string, any>[],
  labelField: string,
  valueField: string,
) =>
  _.map(items, i => ({ label: i[labelField], value: i[valueField] } as Item));
