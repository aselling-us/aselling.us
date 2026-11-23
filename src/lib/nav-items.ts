// A constant file mapping enumeration, labels, and links 
export interface NavItem {
  n: string;
  label: string;
  href: string;
}

export const navItems: NavItem[] = [
  { n: '01', label: 'Working', href: '/career' },
  { n: '02', label: 'Doing', href: '/projects' },
  { n: '03', label: 'Writing', href: '/blog' },
  { n: '04', label: 'Reading', href: '/books' },
  { n: '05', label: 'Watching', href: '/films' },
  { n: '06', label: 'Places', href: '/travels' },
];
