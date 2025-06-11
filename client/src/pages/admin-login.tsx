import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

export default function AdminLogin() {
  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!adminId.trim() || !password.trim()) {
      toast({
        title: "Error",
        description: "Please enter both admin ID and password",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    // Simple authentication check
    if (adminId.trim() === "Admin" && password.trim() === "Admin") {
      localStorage.setItem("adminAuthenticated", "true");
      window.location.href = "/admin/dashboard";
    } else {
      toast({
        title: "Error",
        description: "Invalid admin credentials",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="mb-4 sm:mb-6">
          <Button 
            variant="ghost" 
            onClick={() => window.location.href = '/'}
            className="text-slate-600 hover:text-slate-800 text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Back to Application</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </div>
        
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl sm:text-2xl font-semibold text-slate-800">
              Admin Login
            </CardTitle>
            <p className="text-slate-600 text-sm sm:text-base">Access administrative functions</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="admin-id" className="text-sm sm:text-base">Admin ID</Label>
                <Input
                  id="admin-id"
                  type="text"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  placeholder="Enter admin ID"
                  className="mt-1 text-base sm:text-sm"
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-sm sm:text-base">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="mt-1 text-base sm:text-sm"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full text-sm sm:text-base"
                disabled={isLoading}
              >
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}