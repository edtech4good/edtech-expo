import {
  Container,
  CustomPicker,
  DefaultBackgroundImage,
  Expanded,
  H4,
  H5,
  LayoutScrollView,
  Row,
  SizedBox,
  TeacherProfileCard,
} from '@/components';
import { useTeacherProfile } from '@/services';
import { useEffect, useMemo, useState } from 'react';
import { useTheme } from 'styled-components/native';
import { fromStandardsToCustomPickers } from '@/transforms';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
import { Item } from 'react-native-picker-select';

export default function TeacherDashboardScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { fetchAllStandard, fetchProfile, standards, standardProfile } =
    useTeacherProfile();
  const standardPickerItems = useMemo(
    () => fromStandardsToCustomPickers(standards),
    [standards],
  );
  const profile = useMemo(() => standardProfile, [standardProfile]);
  const [selectedStandard, setSelectedStandard] = useState('Select Item');

  useEffect(() => {
    handleTestApi();
  }, []);

  console.log('GG: ', standardPickerItems);
  const handleTestApi = async () => {
    fetchAllStandard();
  };

  const handlePickerChange = (standardId: Item) => {
    console.log('StandardID : ', standardId);
    if (!standardId) return;
    setSelectedStandard(standardId);
    fetchProfile(standardId.value);
  };

  return (
    <LayoutScrollView backgroundColor={theme.colors.surface}>
      <DefaultBackgroundImage />
      <Container
        backgroundColor="transparent"
        paddingLeft={theme.layouts.large}
        paddingBottom={theme.layouts.large}
        paddingRight={theme.layouts.large}
        paddingTop={theme.layouts.large}>
        <Row>
          <TeacherProfileCard />
          <SizedBox.Large width />
          <Expanded
            paddingLeft={theme.layouts.large}
            paddingRight={theme.layouts.large}>
            <Row>
              <CustomPicker
                items={standardPickerItems}
                placeholder="Choose Class"
                value={selectedStandard}
                onChange={handlePickerChange}
              />
            </Row>
            <SizedBox.Large height />
            <H4 fontWeight="semi" alignSelf="flex-start">
              {t('screen.profile.classDetailTitle')}
            </H4>
            <SizedBox.Large height />
            <SizedBox.Large height />
            <H5
              alignSelf="flex-start"
              textAlign="left"
              color={theme.colors.onSurfaceVariant}>
              {`${t('screen.profile.classNameLabel')}: `}
              {_.get(profile, 'teacher.schoolname', 'N/A')}
            </H5>
            <SizedBox.Large height />
            <H5
              alignSelf="flex-start"
              textAlign="left"
              color={theme.colors.onSurfaceVariant}>
              {`${t('screen.profile.numOfStudentLabel')}: `}
              {_.get(profile, 'numberofstudents', 'N/A')}
            </H5>
            <SizedBox.Large height />
            <H5
              alignSelf="flex-start"
              textAlign="left"
              color={theme.colors.onSurfaceVariant}>
              {`${t('screen.profile.avgTimeSpentLabel')}: `}
              {_.get(profile, 'averagestudentusage', 'N/A')}
            </H5>
            <SizedBox.Large height />
            <H5
              alignSelf="flex-start"
              textAlign="left"
              color={theme.colors.onSurfaceVariant}>
              {`${t('screen.profile.lastLoginLabel')}: `}
              {_.get(profile, 'teacher.logintime', 'N/A')}
            </H5>
          </Expanded>
        </Row>
      </Container>
    </LayoutScrollView>
  );
}
