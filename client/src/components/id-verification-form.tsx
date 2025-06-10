import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employeeId.trim()) {
      toast({
        title: "Error",
        description: "Please enter your National ID",
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
        ? "National ID not found. Please check your ID."
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
        <p className="text-slate-600">Enter your National ID to check job eligibility</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-6">
        <div>
          <Label htmlFor="national-id">National ID</Label>
          <Input
            id="national-id"
            type="text"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            placeholder="Enter your National ID"
            className="mt-1"
          />
        </div>

        <Button 
          type="submit" 
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? "Verifying..." : "Verify Eligibility"}
        </Button>
      </form>
    </div>
  );
}
