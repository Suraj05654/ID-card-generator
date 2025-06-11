
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Briefcase, UserCheck, FileText, Home as HomeIcon, Info } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center py-10 lg:py-16 px-4">
      <div className="text-center mb-12 animate-fade-in">
        <div className="inline-block p-4 bg-primary/10 rounded-full mb-6">
          <HomeIcon className="h-12 w-12 text-primary" />
        </div>
        <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight text-primary">
          Welcome to ECR ID Connect
        </h1>
        <p className="mt-4 text-lg text-foreground/80 max-w-2xl mx-auto">
          Your online portal for Employee Identity Card applications at East Coast Railway.
          Please use the sidebar navigation to get started.
        </p>
      </div>

      <Card className="w-full max-w-3xl shadow-xl animate-slide-in-up" style={{animationDelay: '0.2s'}}>
        <CardHeader>
           <div className="flex items-center space-x-3">
            <Info className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="font-headline text-2xl">Important Information</CardTitle>
              <CardDescription>Quick links and guidance.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-md text-foreground">
            This portal allows both Gazetted and Non-Gazetted employees of East Coast Railway to apply for new Identity Cards and check the status of their applications.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Button asChild size="lg" className="w-full group bg-primary hover:bg-primary/90">
              <Link href="/apply/non-gazetted">
                Apply (Non-Gazetted) <Briefcase className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button asChild size="lg" className="w-full group bg-primary hover:bg-primary/90">
              <Link href="/apply/gazetted">
                Apply (Gazetted) <UserCheck className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
           <div className="text-center mt-6">
            <Button asChild variant="outline" size="lg" className="group">
              <Link href="/status">
                Track Application Status <FileText className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
          <div className="mt-6 p-4 bg-muted/50 rounded-md border">
            <h4 className="font-semibold text-primary mb-2">Before you apply:</h4>
            <ul className="list-disc list-inside text-sm space-y-1 text-foreground/90">
              <li>Ensure you have scanned copies of your photo and signature (.jpg, .jpeg, .png, max 2MB each).</li>
              <li>Gazetted officers: Also prepare scanned copies of your name and designation in Hindi.</li>
              <li>Have details of family members (if applicable) and emergency contact information ready.</li>
              <li>Review the application guidelines if available.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
      
    </div>
  );
}
