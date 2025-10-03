import { Images } from '@/assets_edtech';
import {
  Column,
  DefaultBackgroundImage,
  Expanded,
  H2,
  H5,
  H6,
  LayoutScrollView,
  Row,
  SizedBox,
} from '@/components';
import { Image, ScrollView, View } from 'react-native';
import { CircularProgressbar } from 'react-circular-progressbar';
import { useTheme } from 'styled-components/native';
import 'react-circular-progressbar/dist/styles.css';
import { changeColorOpacity } from '@/utils';
import LessonResultItem from './Components/LessonResultItem';
import { DashboardCardColors } from '@/constants';
import { useAppSelector } from '@/redux';
import { getProfile } from '@/redux/slices';

export default function StudentDashboardScreen() {
  const theme = useTheme();
  const profile = useAppSelector(getProfile);

  return (
    <LayoutScrollView backgroundColor={theme.colors.surface}>
      <DefaultBackgroundImage />
      <Row
        alignItems="center"
        borderRadius={theme.layouts.defaultRadius}
        paddingTop={theme.layouts.large}
        paddingBottom={theme.layouts.large}
        paddingLeft={theme.layouts.large}
        paddingRight={theme.layouts.large}>
        <Image
          source={Images.SampleProfile}
          resizeMethod="resize"
          resizeMode="contain"
          style={{ width: 100, height: 100 }}
        />
        <SizedBox.Large width />
        <Column justifyContent="center">
          <H6 alignSelf="flex-start" fontWeight="bold">
            Good morning,
          </H6>
          <H2 alignSelf="flex-start" fontWeight="semi">
            {`${profile?.studentfirstname ?? 'N/A'}!`}
          </H2>
        </Column>
      </Row>
      <Expanded
        flexDirection="row"
        paddingTop={theme.layouts.large}
        paddingBottom={theme.layouts.large}
        paddingLeft={theme.layouts.large}
        paddingRight={theme.layouts.large}>
        <Expanded
          backgroundColor={theme.colors.surface}
          justifyContent="center"
          borderRadius={6}
          style={{
            borderWidth: 3,
            borderColor: theme.colors.divider,
            maxHeight: 466,
          }}>
          <Image
            source={Images.TrophyImage}
            resizeMethod="resize"
            resizeMode="contain"
            style={{ height: 64 }}
          />
          <H5 fontWeight="semi">Total Points</H5>
          <SizedBox.Large height />
          <SizedBox.Large height />
          <View style={{ width: 175 }}>
            <CircularProgressbar
              value={66}
              text={`${99}`}
              styles={{
                path: { stroke: theme.colors.primary },
                trail: { stroke: changeColorOpacity(theme.colors.primary, 10) },
                text: {
                  fontFamily: 'PoppinsSemiBold',
                  fontSize: `${theme.fontSizes.h4}px`,
                  alignSelf: 'flex-end',
                  fill: theme.colors.customHeaderTitle,
                },
              }}
            />
          </View>
        </Expanded>
        <SizedBox.Large width />
        <ScrollView
          style={{ flex: 2, alignSelf: 'stretch' }}
          contentContainerStyle={{
            height: '100%',
          }}>
          <Row>
            <LessonResultItem
              foregroundColor={DashboardCardColors[0].foreground as string}
              backgroundColor={DashboardCardColors[0].background}
              primaryColor={DashboardCardColors[0].primary}
              image={Images.Mouse}
              maxProgress={2}
              progress={0}
              name="Bridge"
              score="23"
            />
            <SizedBox.Large width />
            <LessonResultItem
              foregroundColor={DashboardCardColors[2].foreground as string}
              backgroundColor={DashboardCardColors[2].background}
              primaryColor={DashboardCardColors[2].primary}
              image={Images.Rabbit}
              maxProgress={2}
              progress={0}
              name="Grade 8"
              score="23"
            />
          </Row>
          <SizedBox.Large height />
          <Row>
            <LessonResultItem
              foregroundColor={DashboardCardColors[1].foreground as string}
              backgroundColor={DashboardCardColors[1].background}
              primaryColor={DashboardCardColors[1].primary}
              image={Images.Lion}
              maxProgress={2}
              progress={0}
              name="Grade 7"
              score="23"
            />
            <SizedBox.Large width />
            <LessonResultItem
              foregroundColor={DashboardCardColors[3].foreground as string}
              backgroundColor={DashboardCardColors[3].background}
              primaryColor={DashboardCardColors[3].primary}
              image={Images.Bear}
              maxProgress={2}
              progress={0}
              name="Grade 9"
              score="23"
            />
          </Row>
        </ScrollView>
      </Expanded>
    </LayoutScrollView>
  );
}
