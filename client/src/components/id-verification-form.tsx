import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface UserData {
  id: string;
  name: string;
  eligible: boolean;
  cohort: string;
}

interface IDVerificationFormProps {
  onVerified: (userData: UserData) => void;
}

export function IDVerificationForm({ onVerified }: IDVerificationFormProps) {
  const [employeeId, setEmployeeId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [fileName, setFileName] = useState("");
  const { toast } = useToast();

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
      console.error("Upload error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employeeId.trim()) {
      toast({
        title: "Error",
        description: "Please enter your Employee ID",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await apiRequest('POST', '/api/verify-employee', {
        employeeId: employeeId.trim().toUpperCase()
      });
      
      const userData = await response.json();
      onVerified(userData);
      
      toast({
        title: "Success",
        description: `Welcome ${userData.name}! You are eligible for Cohort ${userData.cohort}`,
      });
    } catch (error: any) {
      const errorMessage = error.message.includes('404') 
        ? "Employee ID not found. Please check your ID or upload the employee database."
        : error.message.includes('403')
        ? "You are not eligible for this job application. Please contact HR."
        : "An error occurred. Please try again.";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-slate-800 mb-2">Verify Your Eligibility</h2>
        <p className="text-slate-600">Enter your employee ID to check job eligibility and determine your cohort</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-6">
        <div>
          <Label htmlFor="employee-id">Employee ID</Label>
          <Input
            id="employee-id"
            type="text"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            placeholder="Enter your ID"
            className="mt-1"
          />
        </div>

        {/* File Upload */}
        <div>
          <Label>Employee Database (Excel File)</Label>
          <div className="mt-1">
            <label className={`border-2 border-dashed rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer flex flex-col items-center ${
              fileUploaded ? 'border-green-400 bg-green-50' : 'border-slate-300'
            }`}>
              {fileUploaded ? (
                <>
                  <CheckCircle className="h-12 w-12 text-green-400 mb-4" />
                  <p className="text-green-600 font-medium">File uploaded: {fileName}</p>
                  <p className="text-sm text-slate-500 mt-1">Database loaded successfully</p>
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

        <Button 
          type="submit" 
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? "Verifying..." : "Verify Eligibility"}
        </Button>

        {/* Demo Data */}
        <Card className="mt-6">
          <CardContent className="pt-4">
            <p className="text-sm font-medium text-slate-700 mb-2">Demo IDs for testing:</p>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">EMP001:</span>
                <span className="font-medium text-green-600">Eligible (Cohort A)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">EMP002:</span>
                <span className="font-medium text-green-600">Eligible (Cohort B)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">EMP003:</span>
                <span className="font-medium text-red-600">Not Eligible</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
