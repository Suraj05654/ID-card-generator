
'use client';

import Link from 'next/link';
import Logo, { ITCentreLogoPlaceholder } from './logo';
import { Button } from '@/components/ui/button';
import { User, LogIn, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/components/auth/use-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const AppHeader = () => {
  const { user, signOut } = useAuth();

  return (
    <header className="bg-header-background text-header-foreground shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        {/* Left side: ECR Logo and Main Title */}
        <div className="flex items-center space-x-4">
          <Logo isHeader={true} /> 
        </div>
        
        {/* Center: Application Title (visible on larger screens) */}
        <div className="hidden md:flex flex-col items-center">
           <h1 className="font-headline text-xl lg:text-2xl font-bold text-header-foreground">
             Online Form for I-cards
           </h1>
        </div>

        {/* Right side: IT Centre Logo and Admin Login/User Menu */}
        <div className="flex items-center space-x-4">
          <ITCentreLogoPlaceholder />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-white/20 p-0">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || 'User'} />
                    <AvatarFallback className="bg-header-foreground/20 text-header-foreground">
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.displayName || user.email}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      Admin
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin/dashboard" className="cursor-pointer">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
                  <LogIn className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="outline" asChild className="border-header-foreground text-header-foreground hover:bg-header-foreground hover:text-header-background">
              <Link href="/admin/login" className="flex items-center space-x-1.5">
                <User className="h-4 w-4" />
                <span className="font-medium text-sm">Admin Login</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
