import { useState, useEffect } from "react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language";
import { Upload, CheckCircle, LogOut, Trash2, Plus, Download, DollarSign, Users, MessageSquare, Menu, X } from "lucide-react";
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
          const [monthAbbr, day] = monthDayParts;
          const monthMap: { [key: string]: number } = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
          };
          
          const monthIndex = monthMap[monthAbbr];
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

// Format date for display
const formatDateDisplay = (dateStr: string): string => {
  const date = backendFormatToDate(dateStr);
  if (!date) return dateStr;
  
  // Format as "Mon, Jun 16"
  return format(date, "EEE, MMM d");
};

export function AdminDashboard() {
  // File upload states
  const [fileName, setFileName] = useState("");
  const [fileUploaded, setFileUploaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // UI states
  const [activeTab, setActiveTab] = useState("pricing-matrix");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState<string>("A");
  const [newCohort, setNewCohort] = useState("");
  const [showCreateCohortModal, setShowCreateCohortModal] = useState(false);
  
  // Form states
  const [newLocation, setNewLocation] = useState("");
  const [newDate, setNewDate] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [editSelectedDate, setEditSelectedDate] = useState<Date>();
  const [editingRate, setEditingRate] = useState<string | null>(null);
  const [editingCapacity, setEditingCapacity] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
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

  // Mutations
  const createCohortMutation = useMutation({
    mutationFn: async (cohort: string) => {
      const response = await apiRequest('POST', '/api/admin/cohorts', { cohort });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/cohorts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shift-data'] });
      setNewCohort("");
      setShowCreateCohortModal(false);
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

  // Event handlers
  const handleLogout = () => {
    localStorage.removeItem("adminAuthenticated");
    window.location.href = "/admin";
  };

  const handleCreateCohort = () => {
    if (newCohort.trim()) {
      createCohortMutation.mutate(newCohort.trim());
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/admin/upload-employees', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setFileName(file.name);
        setFileUploaded(true);
        toast({
          title: "Success",
          description: "Employee data uploaded successfully",
        });
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadApplications = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/applications/download');
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'applications.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download applications",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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

  const menuItems = [
    { id: "pricing-matrix", label: "Pricing Matrix", icon: DollarSign },
    { id: "employee-data", label: "Employee Data Upload", icon: Users },
    { id: "line-notifications", label: "LINE Notifications", icon: MessageSquare },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`bg-white shadow-lg transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
        <div className="flex items-center justify-between p-4 border-b">
          {!sidebarCollapsed && (
            <h1 className="text-xl font-bold text-gray-800">Admin Dashboard</h1>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2"
          >
            <Menu className="w-4 h-4" />
          </Button>
        </div>
        
        <nav className="mt-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                  activeTab === item.id ? 'bg-blue-50 border-r-2 border-blue-500 text-blue-600' : 'text-gray-700'
                }`}
              >
                <Icon className="w-5 h-5 min-w-0" />
                {!sidebarCollapsed && (
                  <span className="ml-3 truncate">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>
        
        {/* Logout button at bottom */}
        <div className="absolute bottom-4 left-0 right-0 px-4">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={`w-full justify-start text-gray-700 hover:text-gray-900 hover:bg-gray-100 ${
              sidebarCollapsed ? 'px-2' : 'px-4'
            }`}
          >
            <LogOut className="w-5 h-5 min-w-0" />
            {!sidebarCollapsed && <span className="ml-3">Logout</span>}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">

          {/* Pricing Matrix Content */}
          {activeTab === "pricing-matrix" && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-bold">PRICING MATRIX</h2>
                  <Select value={selectedCohort} onValueChange={setSelectedCohort}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select cohort" />
                    </SelectTrigger>
                    <SelectContent>
                      {cohorts?.map(cohort => (
                        <SelectItem key={cohort} value={cohort}>
                          COHORT {cohort}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Dialog open={showCreateCohortModal} onOpenChange={setShowCreateCohortModal}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Cohort
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Cohort</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="cohort-name">Cohort Name</Label>
                        <Input
                          id="cohort-name"
                          value={newCohort}
                          onChange={(e) => setNewCohort(e.target.value)}
                          placeholder="e.g., C"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setShowCreateCohortModal(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleCreateCohort} 
                          disabled={!newCohort.trim() || createCohortMutation.isPending}
                        >
                          Create Cohort
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Management Controls */}
              <Card>
                <CardHeader>
                  <CardTitle>Manage Locations & Dates</CardTitle>
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
                        placeholder="Select date"
                        className="flex-1"
                      />
                      <Button onClick={handleAddDate} disabled={!selectedDate} size="sm" className="px-3">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pricing Matrix Grid */}
              <Card>
                <CardContent className="p-6">
                  {shiftDataLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : !shiftData || shiftData.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <p className="text-lg mb-2">No shifts configured for cohort {selectedCohort}</p>
                      <p className="text-sm">Add locations and dates above to get started</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      {locations.map(location => (
                        <div key={location} className="space-y-4">
                          <h3 className="text-lg font-bold text-slate-800">{location}</h3>
                          <div className="space-y-3">
                            {dates.map(date => (
                              <div key={date} className="bg-white border rounded-lg p-4 space-y-3">
                                <div className="font-medium text-slate-700">
                                  {formatDateDisplay(date)}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  {['DS', 'NS'].map(shift => {
                                    const shiftEntry = groupedShiftData[`${location}-${date}`]?.[shift];
                                    
                                    return (
                                      <div key={shift} className="bg-slate-50 rounded p-3">
                                        <div className="text-xs font-medium text-slate-600 mb-2 text-center">
                                          {shift === 'DS' ? 'Day Shift' : 'Night Shift'}
                                        </div>
                                        <div className="space-y-1">
                                          <div className="w-full bg-white py-2 px-3 rounded border text-sm font-medium text-center">
                                            NT${shiftEntry?.rate || '800'}
                                          </div>
                                          <div className="w-full bg-white py-1 px-3 rounded border text-xs text-slate-600 text-center">
                                            Capacity: {shiftEntry?.capacity ?? 10}
                                          </div>
                                        </div>
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
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Employee Data Upload Content */}
          {activeTab === "employee-data" && (
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
          )}

          {/* LINE Notifications Content */}
          {activeTab === "line-notifications" && (
            <LineNotifications />
          )}

        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;