
'use client';

import type { StoredApplication } from '@/lib/types'; // Changed back to StoredApplication
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Eye, Filter, Search as SearchIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ChangeEvent} from 'react';
import { useState, useMemo }from 'react';

interface ApplicationTableProps {
  applications: StoredApplication[];
}

const applicationStatusOptions: StoredApplication['status'][] = ["pending", "approved", "rejected"];
const applicantTypeOptions = ["gazetted", "non-gazetted"]; // Assuming these are the types for StoredApplication

export function ApplicationTable({ applications: initialApplications }: ApplicationTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const filteredApplications = useMemo(() => {
    return initialApplications.filter(app => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = (app.fullName || '').toLowerCase().includes(searchLower) ||
                            (app.employeeId || '').toLowerCase().includes(searchLower) ||
                            (app.applicationId || '').toLowerCase().includes(searchLower);
      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
      const matchesType = typeFilter === 'all' || app.applicantType === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [initialApplications, searchTerm, statusFilter, typeFilter]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  
  const getStatusVariant = (status: StoredApplication['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'approved':
        return 'default'; 
      case 'pending':
        return 'secondary'; 
      case 'rejected':
        return 'destructive';
      default:
        return 'outline'; 
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row gap-4 items-center p-4 border rounded-lg bg-card shadow">
        <div className="relative w-full md:flex-grow">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by Name, Employee ID, App ID..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-10 w-full"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {applicationStatusOptions.map(status => (
                <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
           <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Filter by Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {applicantTypeOptions.map(type => (
                <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredApplications.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Filter className="mx-auto h-12 w-12 mb-4" />
          <p className="text-xl font-semibold">No applications found.</p>
          <p>Try adjusting your search or filter criteria, or check if new applications have been submitted.</p>
        </div>
      ) : (
      <div className="border rounded-lg overflow-hidden shadow bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/60">
              <TableHead>Application ID</TableHead>
              <TableHead>Applicant Name</TableHead>
              <TableHead>Employee ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Submission Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredApplications.map((app) => (
              <TableRow key={app.applicationId} className="hover:bg-muted/20 transition-colors">
                <TableCell className="font-medium">{app.applicationId}</TableCell>
                <TableCell>{app.fullName}</TableCell>
                <TableCell>{app.employeeId || 'N/A'}</TableCell>
                <TableCell className="capitalize">{app.applicantType}</TableCell>
                <TableCell>{format(new Date(app.submissionDate), 'dd MMM yyyy, p')}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(app.status)} className="capitalize text-xs">
                    {app.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" asChild className="group">
                    <Link href={`/admin/dashboard/applications/${app.applicationId}`}> 
                      <Eye className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" /> View
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      )}
    </div>
  );
}
