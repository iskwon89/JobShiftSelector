import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import CryptoJS from 'crypto-js';

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
  const [validationError, setValidationError] = useState("");
  const { toast } = useToast();

  const validateEmployeeId = (id: string) => {
    const trimmedId = id.trim();
    if (!trimmedId) {
      setValidationError("Please enter your National ID");
      return false;
    }
    if (trimmedId.length !== 10) {
      setValidationError("National ID must be exactly 10 characters long");
      return false;
    }
    setValidationError("");
    return true;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmployeeId(value);
    if (value.trim()) {
      validateEmployeeId(value);
    } else {
      setValidationError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmployeeId(employeeId)) {
      return;
    }

    try {
      setIsLoading(true);
      // Hash the employee ID before sending to server
      const normalizedId = employeeId.trim().toUpperCase();
      const hashedId = CryptoJS.MD5(normalizedId).toString();
      console.log("Frontend verification - Input:", normalizedId, "-> Hash:", hashedId);
      
      const response = await apiRequest('POST', '/api/verify-employee', {
        employeeId: hashedId
      });
      
      const userData = await response.json();
      onVerified(userData);
      
      toast({
        title: "Success!",
      });
    } catch (error: any) {
      const errorMessage = error.message.includes('404') 
        ? "National ID not found. Please check your ID."
        : error.message.includes('403')
        ? "You are not eligible for scheduling through Couflex."
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
    <div className="relative">
      {/* Admin Login Button */}
      <div className="absolute top-0 right-0">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => window.location.href = '/admin'}
          className="text-slate-500 hover:text-slate-700 text-xs sm:text-sm"
        >
          Admin Login
        </Button>
      </div>

      <div className="text-center mb-6 sm:mb-8 pt-8 sm:pt-0">
        <h2 className="text-xl sm:text-2xl font-semibold text-slate-800 mb-2">National ID Verification</h2>
        <p className="text-slate-600 text-sm sm:text-base px-4 sm:px-0">Please enter your Taiwan National ID to begin your application.</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4 sm:space-y-6 px-4 sm:px-0">
        <div>
          <Label htmlFor="national-id" className="text-sm sm:text-base">National ID</Label>
          <Input
            id="national-id"
            type="text"
            value={employeeId}
            onChange={handleInputChange}
            placeholder="e.g. A123456789"
            className={`mt-1 text-base sm:text-sm ${validationError ? 'border-red-500' : ''}`}
          />
          {validationError && (
            <p className="text-red-500 text-xs mt-1">{validationError}</p>
          )}
        </div>

        <Button 
          type="submit" 
          className="w-full text-sm sm:text-base"
          disabled={isLoading}
        >
          {isLoading ? "Verifying..." : "Verify Eligibility"}
        </Button>
      </form>
    </div>
  );
}
