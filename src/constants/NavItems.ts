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

// Corporate-only variant of studentNavItems, adding the Library tab/rail
// item (Jesse, 26 Sep: corporate nav = Home · Library · Profile). Kept
// separate rather than adding Library to studentNavItems itself, because
// that list is also read by the kids theme's CustomDrawer — the kids
// drawer must not gain a Library entry. Only NavRail (corporate tablet)
// reads this list; the corporate phone Tabs bar is configured directly in
// app/(app)/(home)/_layout.tsx rather than from either list.
export const corporateStudentNavItems: Array<NavItem> = [
  {
    title: 'drawer.home',
    icon: 'home',
    url: '/home/courses',
    route: '/home/subjects',
  },
  {
    title: 'drawer.library',
    icon: 'local-library',
    url: '/library',
    route: '/library',
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
