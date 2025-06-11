
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { RailSymbol, Building } from 'lucide-react'; // Using more relevant icons as placeholders

// Placeholder for IT Centre Logo - Moved to top level
export const ITCentreLogoPlaceholder = () => (
  // Replace with actual <Image /> tag when logo is available
  <Building className="h-8 w-8 text-header-foreground" />
);

const Logo = ({ isHeader = false }: { isHeader?: boolean }) => {
  // Placeholder for East Coast Railway Logo
  const ECRLogo = () => (
    <div className="flex items-center space-x-2">
      {/* Replace with actual <Image /> tag when logo is available */}
      <RailSymbol className={`h-8 w-8 ${isHeader ? 'text-header-foreground' : 'text-primary'}`} />
      <span className={`font-bold ${isHeader ? 'text-header-foreground text-lg md:text-xl' : 'text-primary text-2xl'}`}>
        East Coast Railway
      </span>
    </div>
  );

  if (isHeader) {
    return (
      <Link href="/" className="flex items-center space-x-3 hover:opacity-90 transition-opacity">
        <ECRLogo />
      </Link>
    );
  }

  // Default logo for other places (e.g. Admin login page, if not using the header version)
  return (
    <Link href="/" className="flex items-center space-x-3 text-primary hover:text-primary/90 transition-colors">
      <RailSymbol className="h-10 w-10" />
      <span className="font-headline text-3xl font-bold">ECR ID Connect</span>
    </Link>
  );
};

export default Logo;
