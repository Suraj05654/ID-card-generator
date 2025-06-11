
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Edit3, UserCheck, FileText, Briefcase } from 'lucide-react'; // UserSquare changed to Edit3 or Briefcase
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// Sidebar navigation items based on the guide
const sidebarNavItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/apply/non-gazetted', label: 'Apply for new I-card (NG)', icon: Briefcase }, // NG more like general staff
  { href: '/apply/gazetted', label: 'Apply for new I-card (GAZ)', icon: UserCheck }, // GAZ like officer/checked user
  { href: '/status', label: 'Application details & status', icon: FileText },
];

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-full bg-sidebar-background text-sidebar-foreground border-r border-sidebar-border p-4 space-y-4 fixed top-20 left-0 shadow-lg overflow-y-auto">
      <nav className="flex flex-col space-y-2">
        {sidebarNavItems.map((item) => {
          // More robust active check: exact match for home, startsWith for others.
          // For apply routes, ensure that /apply/gazetted isn't marked active when on /apply/non-gazetted
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          
          return (
            <Button
              key={item.href}
              asChild
              variant={isActive ? 'default' : 'ghost'} // Use default (primary) for active, ghost for others
              className={cn(
                "w-full justify-start text-left px-3 py-2.5 rounded-md text-sm font-medium", // Slightly larger py
                isActive 
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90' 
                  : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground'
              )}
            >
              <Link href={item.href}>
                <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                {item.label}
              </Link>
            </Button>
          );
        })}
      </nav>
    </aside>
  );
}
