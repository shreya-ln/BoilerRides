import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Train, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";

const SignIn = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({
    email: "",
    password: "",
    general: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const validatePurdueEmail = (email: string) => {
    const purdueEmailRegex = /^[^\s@]+@purdue\.edu$/;
    return purdueEmailRegex.test(email);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    
    // Clear errors when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors({
        ...errors,
        [name]: "",
        general: "",
      });
    }
  };

  const fillDemoCredentials = () => {
    setFormData({
      email: "demo@purdue.edu",
      password: "demo123"
    });
    setErrors({
      email: "",
      password: "",
      general: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Reset errors
    setErrors({ email: "", password: "", general: "" });
    
    // Validate Purdue email
    if (!validatePurdueEmail(formData.email)) {
      setErrors(prev => ({
        ...prev,
        email: "Please use a valid Purdue email address (@purdue.edu)"
      }));
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await signIn(formData.email, formData.password);
      
      if (error) {
        setErrors(prev => ({
          ...prev,
          general: error.message || "Failed to sign in"
        }));
      } else if (data.user) {
        // Successful login - redirect to dashboard
        navigate("/dashboard");
      }
    } catch (err) {
      setErrors(prev => ({
        ...prev,
        general: "An unexpected error occurred"
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-purdue border-0">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-secondary p-3 rounded-full">
                <Train className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-secondary">Welcome Back</CardTitle>
            <CardDescription className="text-muted-foreground">
              Sign in to your BoilerRides account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {errors.general && (
              <Alert className="mb-4 border-destructive/50 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Purdue Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your-email@purdue.edu"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={errors.email ? "border-destructive" : ""}
                  required
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={errors.password ? "border-destructive" : ""}
                  required
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-gradient-primary hover:shadow-glow" 
                disabled={isLoading}
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>
            </form>
            
            <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/30">
              <p className="text-xs text-muted-foreground font-medium mb-2 text-center">
                Demo Credentials (for testing)
              </p>
              <div className="space-y-1 text-xs font-mono">
                <p className="text-muted-foreground">
                  <span className="font-medium">Email:</span> demo@purdue.edu
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium">Password:</span> demo123
                </p>
              </div>
              <button
                type="button"
                onClick={fillDemoCredentials}
                className="w-full mt-3 px-3 py-2 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors"
              >
                Fill Demo Credentials
              </button>
              <p className="text-xs text-muted-foreground/70 mt-2 text-center">
                Use these credentials to test the application
              </p>
            </div>
            
            <div className="mt-6 space-y-4 text-center">
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot your password?
              </Link>
              
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/signup" className="text-primary font-medium hover:underline">
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignIn;