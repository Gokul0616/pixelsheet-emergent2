import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Loader2, FileSpreadsheet, AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PasswordStrength {
  score: number;
  feedback: string[];
  color: string;
}

function calculatePasswordStrength(password: string): PasswordStrength {
  let score = 0;
  const feedback: string[] = [];

  if (password.length >= 8) score += 1;
  else feedback.push("At least 8 characters");

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push("Lowercase letter");

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push("Uppercase letter");

  if (/\d/.test(password)) score += 1;
  else feedback.push("Number");

  if (/[@$!%*?&]/.test(password)) score += 1;
  else feedback.push("Special character (@$!%*?&)");

  const colors = ["red", "red", "orange", "yellow", "green"];
  const color = colors[score] || "red";

  return { score, feedback, color };
}

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { register } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordStrength = calculatePasswordStrength(formData.password);
  const passwordsMatch = formData.password === formData.confirmPassword;

  const isFormValid = () => {
    return (
      formData.username.length >= 3 &&
      formData.email.includes("@") &&
      passwordStrength.score >= 4 &&
      passwordsMatch
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      setError("Please fix the form errors before submitting");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await register(formData.username, formData.email, formData.password);
      
      toast({
        title: "Account Created Successfully!",
        description: "Welcome to Ultimate Pixel Sheets. Your account has been created and you're now logged in.",
      });
      
      setLocation("/spreadsheet/1");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToLogin = () => {
    setLocation("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mb-4">
            <FileSpreadsheet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Ultimate Pixel Sheets
          </h1>
          <p className="text-gray-600 mt-2">Create your account</p>
        </div>

        {/* Registration Form */}
        <Card>
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
              Create your account to start building amazing spreadsheets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Choose a username"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  pattern="[a-zA-Z0-9_]+"
                  title="Username can only contain letters, numbers, and underscores"
                  required
                />
                {formData.username && formData.username.length < 3 && (
                  <p className="text-sm text-red-600">Username must be at least 3 characters</p>
                )}
                {formData.username && !/^[a-zA-Z0-9_]+$/.test(formData.username) && (
                  <p className="text-sm text-red-600">Username can only contain letters, numbers, and underscores</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                {formData.password && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Progress 
                        value={(passwordStrength.score / 5) * 100} 
                        className="flex-1 h-2"
                      />
                      <span className={`text-sm font-medium text-${passwordStrength.color}-600`}>
                        {passwordStrength.score === 5 ? "Strong" : 
                         passwordStrength.score >= 3 ? "Good" : 
                         passwordStrength.score >= 2 ? "Fair" : "Weak"}
                      </span>
                    </div>
                    {passwordStrength.feedback.length > 0 && (
                      <div className="text-sm text-gray-600">
                        <span>Password needs: </span>
                        <span>{passwordStrength.feedback.join(", ")}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                {formData.confirmPassword && !passwordsMatch && (
                  <p className="text-sm text-red-600">Passwords do not match</p>
                )}
                
                {formData.confirmPassword && passwordsMatch && formData.password && (
                  <p className="text-sm text-green-600 flex items-center">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Passwords match
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                disabled={isLoading || !isFormValid()} 
                className="w-full"
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Account
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <button
                  onClick={handleGoToLogin}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Sign in
                </button>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Features Info */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-gray-900">What you'll get:</h3>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                <div>✨ AI-powered formulas</div>
                <div>🔄 Real-time collaboration</div>
                <div>📊 Advanced analytics</div>
                <div>🔒 Enterprise security</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Info */}
        <div className="text-center text-xs text-gray-500">
          <p>🔒 Your data is protected with enterprise-grade security</p>
          <p>You can enable two-factor authentication after registration</p>
        </div>
      </div>
    </div>
  );
}