
'use client';

import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getApplicationStatus } from '@/lib/actions/application';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Search, CheckCircle, XCircle, AlertTriangle, Info, CalendarIcon } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';

const StatusCheckSchema = z.object({
  applicationId: z.string().min(1, 'Application ID is required'),
  dateOfBirth: z.string().refine(val => isValid(parseISO(val)), { message: "Date of Birth is required" }), // Expect YYYY-MM-DD string
});

type StatusCheckFormValues = z.infer<typeof StatusCheckSchema>;

interface StatusResult {
  success: boolean;
  message: string;
  status?: 'pending' | 'approved' | 'rejected' | null;
  applicantName?: string | null;
  submissionDate?: string | null;
}

interface StatusFormProps {
  title: string;
  formType: 'gazetted' | 'non-gazetted'; // For internal logic if needed, or just styling
  backgroundColorClass: string; // e.g., 'bg-status-gaz-bg'
  onSubmit: (data: StatusCheckFormValues) => Promise<void>;
  isLoading: boolean;
  statusResult: StatusResult | null;
  searchParamsAppId?: string | null;
  searchParamsDob?: string | null; // Expect YYYY-MM-DD
}

function StatusCheckCard({ title, backgroundColorClass, onSubmit, isLoading, statusResult, searchParamsAppId, searchParamsDob }: StatusFormProps) {
  const form = useForm<StatusCheckFormValues>({
    resolver: zodResolver(StatusCheckSchema),
    defaultValues: {
      applicationId: searchParamsAppId || '',
      dateOfBirth: (searchParamsDob && isValid(parseISO(searchParamsDob))) ? searchParamsDob : '',
    },
  });
  
  const { control, handleSubmit, setValue } = form;

  useEffect(() => {
    if (searchParamsAppId) setValue('applicationId', searchParamsAppId);
    if (searchParamsDob && isValid(parseISO(searchParamsDob))) {
        setValue('dateOfBirth', searchParamsDob); // Already YYYY-MM-DD
    }
  }, [searchParamsAppId, searchParamsDob, setValue]);
  

  const getStatusPill = (status: string | null | undefined) => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700"><CheckCircle className="w-4 h-4 mr-1.5" /> Approved</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700"><XCircle className="w-4 h-4 mr-1.5" /> Rejected</span>;
      case 'pending':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700"><Info className="w-4 h-4 mr-1.5" /> Pending</span>;
      default:
        return null;
    }
  };

  return (
    <Card className={`shadow-lg ${backgroundColorClass}`}>
      <CardHeader className="text-center">
        <CardTitle className="font-headline text-xl md:text-2xl text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={control}
              name="applicationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Enter Application ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter Application ID" {...field} className="bg-white" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="dateOfBirth" // Storing as YYYY-MM-DD string
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Enter DOB</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal bg-white",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value && isValid(parseISO(field.value)) ? 
                            format(parseISO(field.value), "dd/MM/yyyy") : 
                            <span>Enter DOB</span>
                          }
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value && isValid(parseISO(field.value)) ? parseISO(field.value) : undefined}
                        onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : '')}
                        captionLayout="dropdown-buttons"
                        fromYear={1900}
                        toYear={new Date().getFullYear()}
                        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} className="w-full group bg-green-600 hover:bg-green-700 text-white">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Submit'}
            </Button>
          </form>
        </Form>
        {statusResult && (
          <Card className="mt-8 animate-fade-in bg-background/80 p-4 rounded-md">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-lg flex items-center">
                {statusResult.success && statusResult.status ? (
                   statusResult.status === 'approved' ? <CheckCircle className="h-5 w-5 mr-2 text-green-500" /> :
                   statusResult.status === 'rejected' ? <XCircle className="h-5 w-5 mr-2 text-red-500" /> :
                   <Info className="h-5 w-5 mr-2 text-yellow-500" />
                ) : !statusResult.success ? <AlertTriangle className="h-5 w-5 mr-2 text-red-500" /> : null }
                Status Result
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-2 text-sm">
              <p className={`${statusResult.success ? 'text-foreground' : 'text-destructive font-medium'}`}>
                {statusResult.message}
              </p>
              {statusResult.success && statusResult.applicantName && (
                <p><strong>Applicant:</strong> {statusResult.applicantName}</p>
              )}
              {statusResult.success && statusResult.submissionDate && (
                <p><strong>Submitted On:</strong> {statusResult.submissionDate}</p>
              )}
              {statusResult.success && statusResult.status && (
                <div className="flex items-center space-x-2 pt-1">
                  <strong>Status:</strong> {getStatusPill(statusResult.status)}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}


export default function StatusPage() {
  const searchParams = useSearchParams();
  const [gazStatusResult, setGazStatusResult] = useState<StatusResult | null>(null);
  const [nonGazStatusResult, setNonGazStatusResult] = useState<StatusResult | null>(null);
  const [isLoadingGaz, setIsLoadingGaz] = useState(false);
  const [isLoadingNonGaz, setIsLoadingNonGaz] = useState(false);
  
  const appIdFromQuery = searchParams.get('appId');
  const dobFromQuery = searchParams.get('dob'); // Expects YYYY-MM-DD

  const handleStatusCheck = async (data: StatusCheckFormValues, formType: 'gazetted' | 'non-gazetted') => {
    if (formType === 'gazetted') {
      setIsLoadingGaz(true);
      setGazStatusResult(null);
    } else {
      setIsLoadingNonGaz(true);
      setNonGazStatusResult(null);
    }

    try {
      // data.dateOfBirth is already YYYY-MM-DD string
      const result = await getApplicationStatus(data.applicationId, data.dateOfBirth);
      if (formType === 'gazetted') setGazStatusResult(result);
      else setNonGazStatusResult(result);
    } catch (error: any) {
      const errorResult = { success: false, message: error.message || 'An error occurred while checking status.' };
      if (formType === 'gazetted') setGazStatusResult(errorResult);
      else setNonGazStatusResult(errorResult);
    } finally {
      if (formType === 'gazetted') setIsLoadingGaz(false);
      else setIsLoadingNonGaz(false);
    }
  };
  
  // Effect to auto-submit if query params are present
  useEffect(() => {
    if (appIdFromQuery && dobFromQuery && isValid(parseISO(dobFromQuery))) {
      // Attempt to check for both, or decide based on appId pattern if possible
      // For now, it pre-fills; user clicks submit.
      // To auto-submit, you'd call handleStatusCheck here, but need a way to know if it was for Gaz or NonGaz
      // For example, if (searchParams.get('type') === 'gazetted') { ... }
    }
  }, [appIdFromQuery, dobFromQuery]);


  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
       <div className="text-center mb-12">
          <Search className="mx-auto h-12 w-12 text-primary mb-4" />
          <h1 className="font-headline text-3xl md:text-4xl">Check Application Status</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Enter your Application ID and Date of Birth below.
          </p>
        </div>
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <StatusCheckCard
          title="Application Status (Gazetted)"
          formType="gazetted"
          backgroundColorClass="bg-status-gaz-bg" // Tailwind class from globals.css
          onSubmit={(data) => handleStatusCheck(data, 'gazetted')}
          isLoading={isLoadingGaz}
          statusResult={gazStatusResult}
          searchParamsAppId={appIdFromQuery}
          searchParamsDob={dobFromQuery}
        />
        <StatusCheckCard
          title="Application Status (Non-Gazetted)"
          formType="non-gazetted"
          backgroundColorClass="bg-status-nongaz-bg" // Tailwind class from globals.css
          onSubmit={(data) => handleStatusCheck(data, 'non-gazetted')}
          isLoading={isLoadingNonGaz}
          statusResult={nonGazStatusResult}
          searchParamsAppId={appIdFromQuery}
          searchParamsDob={dobFromQuery}
        />
      </div>
    </div>
  );
}
