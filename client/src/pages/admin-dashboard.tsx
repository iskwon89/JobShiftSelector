import { useState, useEffect } from "react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Header } from "@/components/header";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language";
import { Upload, CheckCircle, LogOut, Trash2, Plus, Download } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ShiftData } from "@shared/schema";
import { downloadSampleExcel } from "@/lib/sample-excel";
import { DatePicker } from "@/components/date-picker";
import { format } from "date-fns";
import { LineNotifications } from "./line-notifications";

// Convert Date object to "13-Jun" format for backend
const dateToBackendFormat = (date: Date): string => {
  return format(date, "d-MMM");
};

// Convert "13-Jun" format or "Mon, Jun 16" format to Date object
const backendFormatToDate = (dateStr: string): Date | null => {
  try {
    const currentYear = new Date().getFullYear();
    
    // Handle "13-Jun" format
    if (dateStr.includes('-')) {
      const [day, monthAbbr] = dateStr.split('-');
      const monthMap: { [key: string]: number } = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      
      const monthIndex = monthMap[monthAbbr];
      if (monthIndex === undefined) return null;
      
      return new Date(currentYear, monthIndex, parseInt(day));
    }
    
    // Handle "Mon, Jun 16" format - extract day and month
    if (dateStr.includes(', ')) {
      const parts = dateStr.split(', ');
      if (parts.length === 2) {
        const [, monthDay] = parts;
        const monthDayParts = monthDay.split(' ');
        if (monthDayParts.length === 2) {
          const [month, day] = monthDayParts;
          
          const monthMap: { [key: string]: number } = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
          };
          
          const monthIndex = monthMap[month];
          if (monthIndex !== undefined) {
            return new Date(currentYear, monthIndex, parseInt(day));
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

// Format date from "13-Jun" to "Mon, Jun 16" format
const formatDateDisplay = (dateStr: string) => {
  const date = backendFormatToDate(dateStr);
  if (!date) return dateStr;
  
  return format(date, "EEE, MMM d");
};

export default function AdminDashboard() {
  const [fileUploaded, setFileUploaded] = useState(false);
  const [fileName, setFileName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Current cohort selection
  const [selectedCohort, setSelectedCohort] = useState<string>("A");
  const [newCohort, setNewCohort] = useState("");
  
  // New location/date form states
  const [newLocation, setNewLocation] = useState("");
  const [newDate, setNewDate] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [editSelectedDate, setEditSelectedDate] = useState<Date>();
  const [editingRate, setEditingRate] = useState<string | null>(null);
  const [editingCapacity, setEditingCapacity] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  
  // Edit location/date states
  const [editingLocation, setEditingLocation] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editLocationValue, setEditLocationValue] = useState("");
  const [editDateValue, setEditDateValue] = useState("");
  
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  // Check authentication
  useEffect(() => {
    const isAuthenticated = localStorage.getItem("adminAuthenticated");
    if (!isAuthenticated) {
      window.location.href = "/admin";
    }
  }, []);

  // Fetch available cohorts
  const { data: cohorts } = useQuery<string[]>({
    queryKey: ['/api/admin/cohorts'],
    queryFn: async () => {
      const response = await fetch('/api/admin/cohorts');
      if (!response.ok) throw new Error('Failed to fetch cohorts');
      return response.json();
    }
  });

  // Fetch shift data for all cohorts
  const { data: allShiftData, isLoading: shiftDataLoading } = useQuery<ShiftData[]>({
    queryKey: ['/api/admin/shift-data'],
    queryFn: async () => {
      const response = await fetch('/api/admin/shift-data');
      if (!response.ok) throw new Error('Failed to fetch shift data');
      return response.json();
    }
  });

  // Filter shift data for selected cohort
  const shiftData = allShiftData?.filter(s => s.cohort === selectedCohort) || [];

  // Mutations for cohort management
  const createCohortMutation = useMutation({
    mutationFn: async (cohort: string) => {
      const response = await apiRequest('POST', '/api/admin/cohorts', { cohort });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cohorts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shift-data'] });
      setNewCohort("");
      toast({
        title: "Success",
        description: "Cohort matrix created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create cohort matrix",
        variant: "destructive",
      });
    }
  });

  // Mutations for shift data management
  const addLocationMutation = useMutation({
    mutationFn: async (location: string) => {
      const response = await apiRequest('POST', '/api/admin/add-location', { location, cohort: selectedCohort });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shift-data'] });
      setNewLocation("");
      toast({
        title: "Success",
        description: "Location added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add location",
        variant: "destructive",
      });
    }
  });

  const addDateMutation = useMutation({
    mutationFn: async (date: string) => {
      const response = await apiRequest('POST', '/api/admin/add-date', { date, cohort: selectedCohort });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shift-data'] });
      setNewDate("");
      setSelectedDate(undefined);
      toast({
        title: "Success",
        description: "Date added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add date",
        variant: "destructive",
      });
    }
  });

  const updateRateMutation = useMutation({
    mutationFn: async ({ id, rate }: { id: number, rate: string }) => {
      const response = await apiRequest('PUT', `/api/admin/shift-data/${id}`, { rate });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shift-data'] });
      setEditingRate(null);
      setEditingValue("");
      toast({
        title: "Success",
        description: "Rate updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update rate",
        variant: "destructive",
      });
    }
  });

  const updateCapacityMutation = useMutation({
    mutationFn: async ({ id, capacity }: { id: number, capacity: number }) => {
      const response = await apiRequest('PUT', `/api/admin/shift-data/${id}`, { capacity });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shift-data'] });
      setEditingCapacity(null);
      setEditingValue("");
      toast({
        title: "Success",
        description: "Capacity updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update capacity",
        variant: "destructive",
      });
    }
  });

  const deleteLocationMutation = useMutation({
    mutationFn: async (location: string) => {
      const response = await apiRequest('DELETE', `/api/admin/location/${selectedCohort}/${encodeURIComponent(location)}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shift-data'] });
      toast({
        title: "Success",
        description: "Location deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete location",
        variant: "destructive",
      });
    }
  });

  const deleteDateMutation = useMutation({
    mutationFn: async (date: string) => {
      const response = await apiRequest('DELETE', `/api/admin/date/${selectedCohort}/${encodeURIComponent(date)}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shift-data'] });
      toast({
        title: "Success",
        description: "Date deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete date",
        variant: "destructive",
      });
    }
  });

  const updateLocationMutation = useMutation({
    mutationFn: async ({ oldLocation, newLocation }: { oldLocation: string, newLocation: string }) => {
      const response = await apiRequest('PUT', `/api/admin/location/${selectedCohort}/${encodeURIComponent(oldLocation)}`, { newLocation });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shift-data'] });
      setEditingLocation(null);
      setEditLocationValue("");
      toast({
        title: "Success",
        description: "Location updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update location",
        variant: "destructive",
      });
    }
  });

  const updateDateMutation = useMutation({
    mutationFn: async ({ oldDate, newDate }: { oldDate: string, newDate: string }) => {
      const response = await apiRequest('PUT', `/api/admin/date/${selectedCohort}/${encodeURIComponent(oldDate)}`, { newDate });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shift-data'] });
      setEditingDate(null);
      setEditDateValue("");
      setEditSelectedDate(undefined);
      toast({
        title: "Success",
        description: "Date updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update date",
        variant: "destructive",
      });
    }
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast({
        title: "Error",
        description: "Please select a valid Excel file (.xlsx or .xls)",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsLoading(true);
      
      // Use fetch directly instead of apiRequest for file uploads
      const response = await fetch('/api/upload-excel', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      setFileUploaded(true);
      setFileName(file.name);
      toast({
        title: "Success",
        description: `Excel file processed: ${result.employeesLoaded} employees loaded`,
      });
      
      // Reset the input
      event.target.value = '';
    } catch (error) {
      console.error('Excel upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload Excel file. Please check the file format.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminAuthenticated");
    window.location.href = "/";
  };

  const handleDownloadApplications = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/applications/download');
      
      if (!response.ok) {
        throw new Error('Failed to download applications');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `applications_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "Applications downloaded successfully",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Failed to download applications",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLocation = () => {
    if (newLocation.trim()) {
      addLocationMutation.mutate(newLocation.trim());
    }
  };

  const handleAddDate = () => {
    if (selectedDate) {
      const formattedDate = dateToBackendFormat(selectedDate);
      addDateMutation.mutate(formattedDate);
    }
  };

  const handleCreateCohort = () => {
    if (newCohort.trim()) {
      createCohortMutation.mutate(newCohort.trim());
    }
  };

  const handleEditRate = (shiftId: number, currentRate: string) => {
    setEditingRate(shiftId.toString());
    setEditingValue(currentRate);
  };

  const handleSaveRate = (shiftId: number) => {
    if (editingValue.trim()) {
      updateRateMutation.mutate({ id: shiftId, rate: editingValue.trim() });
    }
  };

  const handleEditCapacity = (shiftId: number, currentCapacity: string) => {
    setEditingCapacity(shiftId.toString());
    setEditingValue(currentCapacity);
  };

  const handleSaveCapacity = (shiftId: number) => {
    const capacity = parseInt(editingValue);
    if (!isNaN(capacity) && capacity >= 0) {
      updateCapacityMutation.mutate({ id: shiftId, capacity });
    }
  };

  const handleCancelEdit = () => {
    setEditingRate(null);
    setEditingCapacity(null);
    setEditingValue("");
  };

  const handleEditLocation = (location: string) => {
    setEditingLocation(location);
    setEditLocationValue(location);
  };

  const handleSaveLocation = (oldLocation: string) => {
    if (editLocationValue.trim() && editLocationValue !== oldLocation) {
      updateLocationMutation.mutate({ oldLocation, newLocation: editLocationValue.trim() });
    } else {
      setEditingLocation(null);
      setEditLocationValue("");
    }
  };

  const handleEditDate = (date: string) => {
    setEditingDate(date);
    const dateObj = backendFormatToDate(date);
    setEditSelectedDate(dateObj || undefined);
  };

  const handleSaveDate = (oldDate: string) => {
    if (editSelectedDate) {
      const newDateStr = dateToBackendFormat(editSelectedDate);
      if (newDateStr !== oldDate) {
        updateDateMutation.mutate({ oldDate, newDate: newDateStr });
      } else {
        setEditingDate(null);
        setEditSelectedDate(undefined);
      }
    } else {
      setEditingDate(null);
      setEditSelectedDate(undefined);
    }
  };

  const handleDeleteLocation = (location: string) => {
    if (confirm(`Are you sure you want to delete location "${location}"? This will remove all associated shift data.`)) {
      deleteLocationMutation.mutate(location);
    }
  };

  const handleDeleteDate = (date: string) => {
    if (confirm(`Are you sure you want to delete date "${date}"? This will remove all associated shift data.`)) {
      deleteDateMutation.mutate(date);
    }
  };

  // Group shift data by location and date for display
  const groupedShiftData = shiftData?.reduce((acc, shift) => {
    const key = `${shift.location}-${shift.date}`;
    if (!acc[key]) {
      acc[key] = {};
    }
    acc[key][shift.shift] = shift;
    return acc;
  }, {} as Record<string, Record<string, ShiftData>>) || {};

  const locations = Array.from(new Set(shiftData?.map(s => s.location) || [])).sort();
  const dates = Array.from(new Set(shiftData?.map(s => s.date) || [])).sort((a, b) => {
    const dateA = backendFormatToDate(a);
    const dateB = backendFormatToDate(b);
    if (!dateA || !dateB) return 0;
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <div className="min-h-screen bg-slate-50 pt-safe">
      <Header showLogout={true} onLogout={handleLogout} />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Tabs defaultValue="excel-upload" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto sm:h-10">
            <TabsTrigger value="excel-upload" className="text-xs sm:text-sm">Employee Data Upload</TabsTrigger>
            <TabsTrigger value="pricing-matrix" className="text-xs sm:text-sm">Pricing Matrix Management</TabsTrigger>
            <TabsTrigger value="line-notifications" className="text-xs sm:text-sm">LINE Notifications</TabsTrigger>
          </TabsList>

          {/* Excel Upload Tab */}
          <TabsContent value="excel-upload">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Employee Database Upload</CardTitle>
                    <p className="text-slate-600">
                      Upload Excel file with employee data (ID, Name, Eligible, Cohort)
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleDownloadApplications}
                    disabled={isLoading}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Applications
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Excel File (.xlsx, .xls)</Label>
                  <div className="mt-2">
                    <label className={`border-2 border-dashed rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer flex flex-col items-center ${
                      fileUploaded ? 'border-green-400 bg-green-50' : 'border-slate-300'
                    }`}>
                      {fileUploaded ? (
                        <>
                          <CheckCircle className="h-12 w-12 text-green-400 mb-4" />
                          <p className="text-green-600 font-medium">File uploaded: {fileName}</p>
                          <p className="text-sm text-slate-500 mt-1">Database updated successfully</p>
                        </>
                      ) : (
                        <>
                          <Upload className="h-12 w-12 text-slate-400 mb-4" />
                          <p className="text-slate-600 font-medium">Upload Excel file or click to browse</p>
                          <p className="text-sm text-slate-500 mt-1">Supports .xlsx, .xls files</p>
                        </>
                      )}
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={isLoading}
                      />
                    </label>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-slate-700">Required Excel Columns:</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadSampleExcel}
                      className="text-xs"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download Sample
                    </Button>
                  </div>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li>• <strong>ID</strong> - National ID (string)</li>
                    <li>• <strong>Name</strong> - Employee name (text)</li>
                    <li>• <strong>Eligible</strong> - Eligibility status (TRUE/FALSE)</li>
                    <li>• <strong>Cohort</strong> - Employee cohort (A, B, etc.)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pricing Matrix Tab */}
          <TabsContent value="pricing-matrix">
            <div className="space-y-6">
              {/* Cohort Management */}
              <Card>
                <CardHeader>
                  <CardTitle>Cohort Management</CardTitle>
                  <p className="text-slate-600">Select or create cohort pricing matrices</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Select Active Cohort</Label>
                      <Select value={selectedCohort} onValueChange={setSelectedCohort}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select cohort" />
                        </SelectTrigger>
                        <SelectContent>
                          {cohorts?.map(cohort => (
                            <SelectItem key={cohort} value={cohort}>
                              Cohort {cohort}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Create New Cohort</Label>
                      <div className="flex gap-2">
                        <Input
                          value={newCohort}
                          onChange={(e) => setNewCohort(e.target.value)}
                          placeholder="e.g., C"
                          className="flex-1"
                        />
                        <Button onClick={handleCreateCohort} disabled={!newCohort.trim()} size="sm" className="px-3">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Add Location/Date Controls */}
              <Card>
                <CardHeader>
                  <CardTitle>Manage Matrix for Cohort {selectedCohort}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Add Location</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newLocation}
                        onChange={(e) => setNewLocation(e.target.value)}
                        placeholder="e.g., FC6"
                        className="flex-1"
                      />
                      <Button onClick={handleAddLocation} disabled={!newLocation.trim()} size="sm" className="px-3">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Add Date</Label>
                    <div className="flex gap-2">
                      <DatePicker
                        date={selectedDate}
                        onDateChange={setSelectedDate}
                        placeholder="Select a date"
                        className="flex-1"
                      />
                      <Button onClick={handleAddDate} disabled={!selectedDate} size="sm" className="px-3">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pricing Matrix */}
              <Card>
                <CardHeader>
                  <CardTitle>Pricing Matrix - Cohort {selectedCohort}</CardTitle>
                  <p className="text-slate-600">Click on any rate (NTD) or capacity to edit it. Changes persist for this cohort.</p>
                </CardHeader>
                <CardContent>
                  {shiftDataLoading ? (
                    <div className="text-center py-8">Loading pricing data...</div>
                  ) : (
                    <>
                      {/* Desktop Table View */}
                      <div className="hidden lg:block w-full">
                        <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-[600px]">
                          <table className="w-full bg-white" style={{ minWidth: `${120 + dates.length * 200}px` }}>
                            <thead className="bg-slate-50 sticky top-0 z-10">
                              <tr>
                                <th className="sticky left-0 bg-slate-50 z-20 w-32 px-4 py-3 text-left text-sm font-semibold text-slate-700 border-b border-r border-slate-200">
                                  Location
                                </th>
                                {dates.map(date => (
                                  <th key={date} className="min-w-[200px] px-4 py-3 text-center text-sm font-semibold text-slate-700 border-b border-l border-slate-200" colSpan={2}>
                                  <div className="flex items-center justify-center gap-1">
                                    {editingDate === date ? (
                                      <div className="flex items-center gap-1">
                                        <DatePicker
                                          date={editSelectedDate}
                                          onDateChange={setEditSelectedDate}
                                          placeholder="Select date"
                                          className="h-6 text-xs w-28"
                                        />
                                        <Button
                                          size="sm"
                                          className="h-5 px-1 text-xs"
                                          onClick={() => handleSaveDate(date)}
                                        >
                                          ✓
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-5 px-1 text-xs"
                                          onClick={() => {
                                            setEditingDate(null);
                                            setEditSelectedDate(undefined);
                                          }}
                                        >
                                          ✕
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1">
                                        <span onClick={() => handleEditDate(date)} className="cursor-pointer hover:text-blue-600">
                                          {formatDateDisplay(date)}
                                        </span>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-4 w-4 p-0 text-red-500 hover:text-red-700"
                                          onClick={() => handleDeleteDate(date)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </th>
                              ))}
                            </tr>
                            <tr className="bg-slate-50">
                              <th className="sticky left-0 bg-slate-50 z-20 w-32 px-4 py-2 text-left text-xs font-medium text-slate-600 border-b border-r border-slate-200"></th>
                              {dates.map(date => (
                                <React.Fragment key={date}>
                                  <th className="min-w-[100px] px-3 py-2 text-center text-xs font-medium text-slate-600 border-b border-l border-slate-200">
                                    MS
                                  </th>
                                  <th className="min-w-[100px] px-3 py-2 text-center text-xs font-medium text-slate-600 border-b border-l border-slate-200">
                                    ES
                                  </th>
                                </React.Fragment>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white">
                            {locations.map((location, locationIndex) => (
                              <tr key={location} className={`h-16 ${locationIndex < locations.length - 1 ? 'border-b border-slate-100' : ''}`}>
                                <td className="sticky left-0 bg-white z-10 w-32 h-16 px-4 py-3 border-r border-slate-200">
                                  <div className="flex items-center gap-1">
                                    {editingLocation === location ? (
                                      <div className="flex items-center gap-1">
                                        <Input
                                          value={editLocationValue}
                                          onChange={(e) => setEditLocationValue(e.target.value)}
                                          className="h-6 text-xs w-16"
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveLocation(location);
                                            if (e.key === 'Escape') {
                                              setEditingLocation(null);
                                              setEditLocationValue("");
                                            }
                                          }}
                                        />
                                        <Button
                                          size="sm"
                                          className="h-5 px-1 text-xs"
                                          onClick={() => handleSaveLocation(location)}
                                        >
                                          ✓
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-5 px-1 text-xs"
                                          onClick={() => {
                                            setEditingLocation(null);
                                            setEditLocationValue("");
                                          }}
                                        >
                                          ✕
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1">
                                        <span onClick={() => handleEditLocation(location)} className="font-medium text-slate-700 cursor-pointer hover:text-blue-600">
                                          {location}
                                        </span>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-4 w-4 p-0 text-red-500 hover:text-red-700"
                                          onClick={() => handleDeleteLocation(location)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                {dates.map(date => (
                                  <React.Fragment key={`${location}-${date}`}>
                                    {['DS', 'NS'].map(shift => {
                                      const shiftEntry = groupedShiftData[`${location}-${date}`]?.[shift];
                                      const isEditingRate = editingRate === shiftEntry?.id.toString();
                                      const isEditingCapacity = editingCapacity === shiftEntry?.id.toString();
                                      
                                      return (
                                        <td key={`${location}-${date}-${shift}`} className="min-w-[100px] h-16 px-2 py-2 text-center border-l border-slate-200">
                                          {isEditingRate ? (
                                            <div className="flex flex-col gap-1">
                                              <Input
                                                value={editingValue}
                                                onChange={(e) => setEditingValue(e.target.value)}
                                                className="h-6 text-xs text-center"
                                                placeholder="1x"
                                              />
                                              <div className="flex gap-1">
                                                <Button
                                                  size="sm"
                                                  className="h-5 px-1 text-xs"
                                                  onClick={() => handleSaveRate(shiftEntry!.id)}
                                                >
                                                  ✓
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  className="h-5 px-1 text-xs"
                                                  onClick={handleCancelEdit}
                                                >
                                                  ✕
                                                </Button>
                                              </div>
                                            </div>
                                          ) : isEditingCapacity ? (
                                            <div className="flex flex-col gap-1">
                                              <Input
                                                value={editingValue}
                                                onChange={(e) => setEditingValue(e.target.value)}
                                                className="h-6 text-xs text-center"
                                                placeholder="10"
                                                type="number"
                                              />
                                              <div className="flex gap-1">
                                                <Button
                                                  size="sm"
                                                  className="h-5 px-1 text-xs"
                                                  onClick={() => handleSaveCapacity(shiftEntry!.id)}
                                                >
                                                  ✓
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  className="h-5 px-1 text-xs"
                                                  onClick={handleCancelEdit}
                                                >
                                                  ✕
                                                </Button>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="w-full h-12 flex flex-col items-center justify-center text-xs">
                                              <button
                                                onClick={() => shiftEntry && handleEditRate(shiftEntry.id, shiftEntry.rate)}
                                                className="w-full text-sm font-medium hover:bg-blue-50 py-1 rounded transition-colors"
                                              >
                                                NT${shiftEntry?.rate || '800'}
                                              </button>
                                              <button
                                                onClick={() => shiftEntry && handleEditCapacity(shiftEntry.id, shiftEntry.capacity?.toString() || '10')}
                                                className="w-full text-xs text-slate-600 hover:bg-green-50 py-1 rounded transition-colors"
                                              >
                                                Cap: {shiftEntry?.capacity ?? 10}
                                              </button>
                                            </div>
                                          )}
                                        </td>
                                      );
                                    })}
                                  </React.Fragment>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        </div>
                      </div>

                      {/* Mobile Card View */}
                      <div className="lg:hidden space-y-4">
                        {locations.map(location => (
                          <div key={location} className="border border-slate-200 rounded-lg">
                            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                              <div className="flex items-center justify-between">
                                {editingLocation === location ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      value={editLocationValue}
                                      onChange={(e) => setEditLocationValue(e.target.value)}
                                      className="h-8 text-sm flex-1"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveLocation(location);
                                        if (e.key === 'Escape') {
                                          setEditingLocation(null);
                                          setEditLocationValue("");
                                        }
                                      }}
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => handleSaveLocation(location)}
                                    >
                                      ✓
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingLocation(null);
                                        setEditLocationValue("");
                                      }}
                                    >
                                      ✕
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between w-full">
                                    <span onClick={() => handleEditLocation(location)} className="font-semibold text-slate-700 cursor-pointer hover:text-blue-600">
                                      {location}
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-red-500 hover:text-red-700"
                                      onClick={() => handleDeleteLocation(location)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="p-4 space-y-3">
                              {dates.map(date => (
                                <div key={date} className="border border-slate-200 rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-3">
                                    {editingDate === date ? (
                                      <div className="flex items-center gap-2">
                                        <DatePicker
                                          date={editSelectedDate}
                                          onDateChange={setEditSelectedDate}
                                          placeholder="Select date"
                                          className="h-7 text-sm flex-1"
                                        />
                                        <Button
                                          size="sm"
                                          onClick={() => handleSaveDate(date)}
                                        >
                                          ✓
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            setEditingDate(null);
                                            setEditSelectedDate(undefined);
                                          }}
                                        >
                                          ✕
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-between w-full">
                                        <span onClick={() => handleEditDate(date)} className="font-medium text-slate-700 cursor-pointer hover:text-blue-600">
                                          {formatDateDisplay(date)}
                                        </span>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="text-red-500 hover:text-red-700"
                                          onClick={() => handleDeleteDate(date)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    {['DS', 'NS'].map(shift => {
                                      const shiftEntry = groupedShiftData[`${location}-${date}`]?.[shift];
                                      const isEditingRate = editingRate === shiftEntry?.id.toString();
                                      const isEditingCapacity = editingCapacity === shiftEntry?.id.toString();
                                      
                                      return (
                                        <div key={shift} className="bg-slate-50 rounded p-3">
                                          <div className="text-xs font-medium text-slate-600 mb-2 text-center">
                                            {shift === 'DS' ? 'Day Shift' : 'Night Shift'}
                                          </div>
                                          {isEditingRate ? (
                                            <div className="space-y-2">
                                              <Input
                                                value={editingValue}
                                                onChange={(e) => setEditingValue(e.target.value)}
                                                className="h-8 text-center"
                                                placeholder="Rate"
                                              />
                                              <div className="flex gap-1">
                                                <Button
                                                  size="sm"
                                                  className="flex-1"
                                                  onClick={() => handleSaveRate(shiftEntry!.id)}
                                                >
                                                  Save
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  className="flex-1"
                                                  onClick={handleCancelEdit}
                                                >
                                                  Cancel
                                                </Button>
                                              </div>
                                            </div>
                                          ) : isEditingCapacity ? (
                                            <div className="space-y-2">
                                              <Input
                                                value={editingValue}
                                                onChange={(e) => setEditingValue(e.target.value)}
                                                className="h-8 text-center"
                                                placeholder="Capacity"
                                                type="number"
                                              />
                                              <div className="flex gap-1">
                                                <Button
                                                  size="sm"
                                                  className="flex-1"
                                                  onClick={() => handleSaveCapacity(shiftEntry!.id)}
                                                >
                                                  Save
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  className="flex-1"
                                                  onClick={handleCancelEdit}
                                                >
                                                  Cancel
                                                </Button>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="space-y-1">
                                              <button
                                                onClick={() => shiftEntry && handleEditRate(shiftEntry.id, shiftEntry.rate)}
                                                className="w-full bg-white hover:bg-blue-50 py-2 px-3 rounded border text-sm font-medium transition-colors"
                                              >
                                                NT${shiftEntry?.rate || '800'}
                                              </button>
                                              <button
                                                onClick={() => shiftEntry && handleEditCapacity(shiftEntry.id, shiftEntry.capacity?.toString() || '10')}
                                                className="w-full bg-white hover:bg-green-50 py-1 px-3 rounded border text-xs text-slate-600 transition-colors"
                                              >
                                                Capacity: {shiftEntry?.capacity ?? 10}
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* LINE Notifications Tab */}
          <TabsContent value="line-notifications">
            <LineNotifications />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}