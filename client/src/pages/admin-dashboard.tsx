import { useState, useEffect } from "react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, CheckCircle, LogOut, Trash2, Plus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ShiftData } from "@shared/schema";

export default function AdminDashboard() {
  const [fileUploaded, setFileUploaded] = useState(false);
  const [fileName, setFileName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // New location/date form states
  const [newLocation, setNewLocation] = useState("");
  const [newDate, setNewDate] = useState("");
  const [editingRate, setEditingRate] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check authentication
  useEffect(() => {
    const isAuthenticated = localStorage.getItem("adminAuthenticated");
    if (!isAuthenticated) {
      window.location.href = "/admin";
    }
  }, []);

  // Fetch shift data for all cohorts
  const { data: shiftData, isLoading: shiftDataLoading } = useQuery<ShiftData[]>({
    queryKey: ['/api/admin/shift-data'],
    queryFn: async () => {
      const response = await fetch('/api/admin/shift-data');
      if (!response.ok) throw new Error('Failed to fetch shift data');
      return response.json();
    }
  });

  // Mutations for shift data management
  const addLocationMutation = useMutation({
    mutationFn: async (location: string) => {
      const response = await apiRequest('POST', '/api/admin/add-location', { location });
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
      const response = await apiRequest('POST', '/api/admin/add-date', { date });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shift-data'] });
      setNewDate("");
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsLoading(true);
      const response = await apiRequest('POST', '/api/upload-excel', formData);
      const result = await response.json();
      
      setFileUploaded(true);
      setFileName(file.name);
      toast({
        title: "Success",
        description: `Excel file processed: ${result.employeesLoaded} employees loaded`,
      });
    } catch (error) {
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

  const handleAddLocation = () => {
    if (newLocation.trim()) {
      addLocationMutation.mutate(newLocation.trim());
    }
  };

  const handleAddDate = () => {
    if (newDate.trim()) {
      addDateMutation.mutate(newDate.trim());
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

  const handleCancelEdit = () => {
    setEditingRate(null);
    setEditingValue("");
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
  const dates = Array.from(new Set(shiftData?.map(s => s.date) || [])).sort();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-slate-800">Admin Dashboard</h1>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Tabs defaultValue="excel-upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="excel-upload">Employee Data Upload</TabsTrigger>
            <TabsTrigger value="pricing-matrix">Pricing Matrix Management</TabsTrigger>
          </TabsList>

          {/* Excel Upload Tab */}
          <TabsContent value="excel-upload">
            <Card>
              <CardHeader>
                <CardTitle>Employee Database Upload</CardTitle>
                <p className="text-slate-600">
                  Upload Excel file with employee data (ID, Name, Eligible, Cohort)
                </p>
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
                  <h4 className="font-medium text-slate-700 mb-2">Required Excel Columns:</h4>
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
              {/* Add Location/Date Controls */}
              <Card>
                <CardHeader>
                  <CardTitle>Add New Location or Date</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Add Location</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newLocation}
                        onChange={(e) => setNewLocation(e.target.value)}
                        placeholder="e.g., FC6"
                      />
                      <Button onClick={handleAddLocation} disabled={!newLocation.trim()}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Add Date</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        placeholder="e.g., 13-Jun"
                      />
                      <Button onClick={handleAddDate} disabled={!newDate.trim()}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pricing Matrix */}
              <Card>
                <CardHeader>
                  <CardTitle>Pricing Matrix</CardTitle>
                  <p className="text-slate-600">Click on any rate to edit it</p>
                </CardHeader>
                <CardContent>
                  {shiftDataLoading ? (
                    <div className="text-center py-8">Loading pricing data...</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border border-slate-200 rounded-lg overflow-hidden table-fixed">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="w-32 px-4 py-3 text-left text-sm font-semibold text-slate-700 border-b border-slate-200">
                              Location
                            </th>
                            {dates.map(date => (
                              <th key={date} className="w-40 px-4 py-3 text-center text-sm font-semibold text-slate-700 border-b border-l border-slate-200" colSpan={2}>
                                {date}
                              </th>
                            ))}
                          </tr>
                          <tr className="bg-slate-50">
                            <th className="w-32 px-4 py-2 text-left text-xs font-medium text-slate-600 border-b border-slate-200"></th>
                            {dates.map(date => (
                              <React.Fragment key={date}>
                                <th className="w-20 px-3 py-2 text-center text-xs font-medium text-slate-600 border-b border-l border-slate-200">
                                  MS
                                </th>
                                <th className="w-20 px-3 py-2 text-center text-xs font-medium text-slate-600 border-b border-l border-slate-200">
                                  ES
                                </th>
                              </React.Fragment>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {locations.map((location, locationIndex) => (
                            <tr key={location} className={`h-16 ${locationIndex < locations.length - 1 ? 'border-b border-slate-100' : ''}`}>
                              <td className="w-32 h-16 px-4 py-3 border-r border-slate-200">
                                <span className="font-medium text-slate-700">{location}</span>
                              </td>
                              {dates.map(date => (
                                <React.Fragment key={`${location}-${date}`}>
                                  {['DS', 'SS'].map(shift => {
                                    const shiftEntry = groupedShiftData[`${location}-${date}`]?.[shift];
                                    const isEditing = editingRate === shiftEntry?.id.toString();
                                    
                                    return (
                                      <td key={`${location}-${date}-${shift}`} className="w-20 h-16 px-2 py-2 text-center border-l border-slate-200">
                                        {isEditing ? (
                                          <div className="flex flex-col gap-1">
                                            <Input
                                              value={editingValue}
                                              onChange={(e) => setEditingValue(e.target.value)}
                                              className="h-8 text-xs text-center"
                                              placeholder="1x"
                                            />
                                            <div className="flex gap-1">
                                              <Button
                                                size="sm"
                                                className="h-6 px-2 text-xs"
                                                onClick={() => handleSaveRate(shiftEntry!.id)}
                                              >
                                                Save
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 px-2 text-xs"
                                                onClick={handleCancelEdit}
                                              >
                                                Cancel
                                              </Button>
                                            </div>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() => shiftEntry && handleEditRate(shiftEntry.id, shiftEntry.rate)}
                                            className="w-full h-12 flex items-center justify-center text-sm font-medium rounded-md hover:bg-slate-50 transition-colors"
                                          >
                                            {shiftEntry?.rate || '1x'}
                                          </button>
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
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}