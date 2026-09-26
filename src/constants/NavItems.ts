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

// My progress (its own route, app/(app)/(home)/progress). Corporate shells
// only — the tablet NavRail and desktop NavSidebar add it after Home; the
// kids CustomDrawer never shows it (its style was never designed).
export const progressNavItem: NavItem = {
  title: 'screen.myProgress.title',
  icon: 'insert-chart-outlined',
  url: '/progress',
  route: '/progress',
};

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
