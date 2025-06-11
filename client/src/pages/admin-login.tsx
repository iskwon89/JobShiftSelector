import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      toast({
        title: "Error",
        description: "Please enter both username and password",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await apiRequest('POST', '/api/admin/login', {
        username: username.trim(),
        password: password.trim()
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Store authentication token
        localStorage.setItem("adminAuthenticated", "true");
        localStorage.setItem("adminToken", result.token);
        
        toast({
          title: "Success",
          description: "Login successful",
        });
        
        // Redirect to admin dashboard
        window.location.href = "/admin/dashboard";
      } else {
        toast({
          title: "Error",
          description: result.message || "Invalid admin credentials",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Admin login error:", error);
      toast({
        title: "Error",
        description: error.message || "Login failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 pt-safe">
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
                <Label htmlFor="username" className="text-sm sm:text-base">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
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