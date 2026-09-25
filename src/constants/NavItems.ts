export interface NavItem {
  title: string;
  icon: string;
  url: string;
  route: string;
}

export const studentNavItems: Array<NavItem> = [
  {
    title: 'drawer.home',
    icon: 'home',
    url: '/home/courses',
    route: '/home/subjects',
  },
  {
    title: 'drawer.profile',
    icon: 'account-circle',
    url: '/profile',
    route: '/profile',
  },
];

export const teacherNavItems: Array<NavItem> = [
  {
    title: 'drawer.teacherDashboard',
    icon: 'home',
    url: 'teacher/dashboard',
    route: 'teacher/dashboard',
  },
  {
    title: 'drawer.teacherTestScore',
    icon: 'home',
    url: 'teacher/score',
    route: 'teacher/score',
  },
  {
    title: 'drawer.teacherDownload',
    icon: 'home',
    url: 'downloadRpi',
    route: 'downloadRpi',
  },
];
