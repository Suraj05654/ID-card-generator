
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import AppHeader from '@/components/shared/header';
import AppSidebar from '@/components/shared/sidebar';
import { AuthProvider } from '@/components/auth/auth-provider';

export const metadata: Metadata = {
  title: 'ECR ID Connect - Online Form for I-cards',
  description: 'Employee ID Card Application Portal for East Coast Railway',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased flex flex-col min-h-screen">
        <AuthProvider>
          <AppHeader />
          <div className="flex flex-1 pt-20"> {/* pt-20 for fixed header height */}
            <AppSidebar />
            {/* Main content area with margin for fixed sidebar and padding */}
            <main className="flex-grow ml-64 p-6 bg-background overflow-y-auto"> 
              {children}
            </main>
          </div>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
