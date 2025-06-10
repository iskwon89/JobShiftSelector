import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ShiftSelection } from "@shared/schema";

interface UserData {
  id: string;
  name: string;
  cohort: string;
}

interface ContactInfoFormProps {
  userData: UserData;
  selectedShifts: ShiftSelection[];
  onSubmitted: (applicationId: string) => void;
  onBack: () => void;
}

export function ContactInfoForm({ userData, selectedShifts, onSubmitted, onBack }: ContactInfoFormProps) {
  const [lineId, setLineId] = useState("");
  const [phone, setPhone] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!lineId.trim() || !phone.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all contact information fields.",
        variant: "destructive",
      });
      return;
    }

    if (!termsAccepted) {
      toast({
        title: "Error",
        description: "Please accept the terms and conditions to continue.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await apiRequest('POST', '/api/submit-application', {
        employeeId: userData.id,
        name: userData.name,
        cohort: userData.cohort,
        selectedShifts,
        lineId: lineId.trim(),
        phone: phone.trim()
      });
      
      const result = await response.json();
      onSubmitted(result.applicationId);
      
      toast({
        title: "Success",
        description: "Your application has been submitted successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to submit application. Please try again.",
        variant: "destructive",
      });
      console.error("Submission error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-slate-800 mb-2">Contact Information</h2>
        <p className="text-slate-600">Complete your application by providing your contact details</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl">
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div>
            <Label htmlFor="line-id">LINE ID</Label>
            <Input
              id="line-id"
              type="text"
              value={lineId}
              onChange={(e) => setLineId(e.target.value)}
              placeholder="Enter your LINE ID"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter your phone number"
              className="mt-1"
            />
          </div>
        </div>

        {/* Application Summary */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-slate-800 mb-4">Application Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-600">Employee:</span>
                <span className="font-medium">{userData.name} ({userData.id})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Cohort:</span>
                <span className="font-medium">Cohort {userData.cohort}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Selected Shifts:</span>
                <span className="font-medium">{selectedShifts.length} shifts</span>
              </div>
              <hr className="border-slate-200" />
              <div className="space-y-2 text-sm">
                {selectedShifts.map((shift, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="text-slate-600">
                      {shift.location} - {shift.date} ({shift.shift})
                    </span>
                    <span className="font-medium">{shift.rate} rate</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Terms and Conditions */}
        <div className="mb-8">
          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
            />
            <label htmlFor="terms" className="text-sm text-slate-600 leading-relaxed">
              I agree to the{" "}
              <a href="#" className="text-blue-600 hover:text-blue-700 underline">
                terms and conditions
              </a>{" "}
              and confirm that all information provided is accurate.
            </label>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button type="button" variant="ghost" onClick={onBack}>
            ← Back to Shift Selection
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? "Submitting..." : "Submit Application"}
          </Button>
        </div>
      </form>
    </div>
  );
}
