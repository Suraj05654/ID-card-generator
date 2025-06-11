
import { getAllApplications } from '@/lib/actions/application'; // Changed back to getAllApplications
import { ApplicationTable } from './(components)/application-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ListChecks } from 'lucide-react';

export default async function AdminDashboardPage() {
  const applications = await getAllApplications(); // Changed back to use applications

  return (
    <div className="container mx-auto">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <ListChecks className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="font-headline text-3xl text-primary">I-Card Application Management</CardTitle> {/* Updated title slightly */}
              <CardDescription className="text-md">
                View, filter, and manage I-Card applications.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {applications.length > 0 ? (
            <ApplicationTable applications={applications} />
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <ListChecks className="mx-auto h-12 w-12 mb-4" />
              <p className="text-xl font-semibold">No applications found.</p>
              <p>New applications will appear here once submitted.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
