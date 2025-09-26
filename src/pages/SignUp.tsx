import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Train, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";

const SignUp = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({
    email: "",
    password: "",
    confirmPassword: "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Reset errors
    setErrors({ email: "", password: "", confirmPassword: "", general: "" });
    
    // Validate Purdue email
    if (!validatePurdueEmail(formData.email)) {
      setErrors(prev => ({
        ...prev,
        email: "Please use a valid Purdue email address (@purdue.edu)"
      }));
      setIsLoading(false);
      return;
    }
    
    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setErrors(prev => ({
        ...prev,
        confirmPassword: "Passwords do not match"
      }));
      setIsLoading(false);
      return;
    }
    
    // Validate password strength
    if (formData.password.length < 6) {
      setErrors(prev => ({
        ...prev,
        password: "Password must be at least 6 characters long"
      }));
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await signUp(formData.email, formData.password);
      
      if (error) {
        setErrors(prev => ({
          ...prev,
          general: error.message || "Failed to create account"
        }));
      } else if (data.user) {
        // Successful signup - show confirmation message or redirect
        setErrors(prev => ({
          ...prev,
          general: "Account created successfully! Please check your email to confirm your account."
        }));
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
            <CardTitle className="text-2xl font-bold text-secondary">Join BoilerRides</CardTitle>
            <CardDescription className="text-muted-foreground">
              Connect with fellow Boilermakers for safe, convenient rides
            </CardDescription>
          </CardHeader>
          <CardContent>
            {errors.general && (
              <Alert className={`mb-4 ${errors.general.includes('successfully') ? 'border-green-500 text-green-700' : 'border-destructive/50 text-destructive'}`}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Purdue Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john@purdue.edu"
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
                  placeholder="Create a secure password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={errors.password ? "border-destructive" : ""}
                  required
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={errors.confirmPassword ? "border-destructive" : ""}
                  required
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-gradient-primary hover:shadow-glow"
                disabled={isLoading}
              >
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/signin" className="text-primary font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignUp;