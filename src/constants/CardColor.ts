import { Images } from '@/assets';
import { Colors } from '@/themes';
import { ImageRequireSource } from 'react-native';

interface CardColorProps {
  background: string;
  foreground?: string;
  primary: string;
  image: ImageRequireSource;
}

export const DashboardCardColors = [
  {
    foreground: Colors.cards[0].primary,
    background: Colors.cards[0].light,
    primary: Colors.cards[0].highlight,
    image: Images.CharacterOne,
  },
  {
    foreground: Colors.cards[1].primary,
    background: Colors.cards[1].light,
    primary: Colors.cards[1].highlight,
    image: Images.CharacterTwo,
  },
  {
    foreground: Colors.cards[2].primary,
    background: Colors.cards[2].light,
    primary: Colors.cards[2].highlight,
    image: Images.CharacterThree,
  },
  {
    foreground: Colors.cards[3].primary,
    background: Colors.cards[3].light,
    primary: Colors.cards[3].highlight,
    image: Images.CharacterFour,
  },
  {
    foreground: Colors.cards[4].primary,
    background: Colors.cards[4].light,
    primary: Colors.cards[4].highlight,
    image: Images.CharacterFive,
  },
  {
    foreground: Colors.cards[5].primary,
    background: Colors.cards[5].light,
    primary: Colors.cards[5].highlight,
    image: Images.CharacterSix,
  },
] as Array<CardColorProps>;

export const ProgressCardColors = [
  {
    background: Colors.cards[0].light,
    primary: Colors.cards[0].highlight,
    image: Images.HouseOne,
  },
  {
    background: Colors.cards[1].light,
    primary: Colors.cards[1].highlight,
    image: Images.HouseTwo,
  },
  {
    background: Colors.cards[2].light,
    primary: Colors.cards[2].highlight,
    image: Images.HouseThree,
  },
  {
    background: Colors.cards[3].light,
    primary: Colors.cards[3].highlight,
    image: Images.HouseFour,
  },
  {
    background: Colors.cards[4].light,
    primary: Colors.cards[4].highlight,
    image: Images.HouseFive,
  },
  {
    background: Colors.cards[5].light,
    primary: Colors.cards[5].highlight,
    image: Images.HouseSix,
  },
] as Array<CardColorProps>;

export const UnitCardColors = [
  {
    background: '#EDF9F0',
    primary: '#287D3C',
    image: Images.HouseOne,
  },
  {
    background: '#FCF4E3',
    primary: '#FFBA33',
    image: Images.HouseTwo,
  },
  {
    background: '#FFEBDA',
    primary: '#FF640D',
    image: Images.HouseThree,
  },
  {
    background: '#B4EBEF',
    primary: '#047780',
    image: Images.HouseFour,
  },
  {
    background: '#E7EFFF',
    primary: '#0843B2',
    image: Images.HouseFive,
  },
  {
    background: '#FEEFEF',
    primary: '#FF427B',
    image: Images.HouseSix,
  },
] as Array<CardColorProps>;
