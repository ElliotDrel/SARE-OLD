"use client";

import { cn } from "@/lib/utils";
import { signUp, checkEmailAvailability, checkPasswordStrength } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

// Animated status indicator component
const StatusIndicator = ({ status, message, isLoading }: { 
  status: 'available' | 'taken' | 'invalid' | 'error' | 'checking' | 'unconfirmed'; 
  message: string; 
  isLoading: boolean;
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'available':
        return { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', icon: '✅' };
      case 'taken':
      case 'unconfirmed':
        return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: '❌' };
      case 'invalid':
        return { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', icon: '⚠️' };
      case 'error':
        return { color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', icon: '❓' };
      case 'checking':
        return { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: '🔍' };
      default:
        return { color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', icon: '' };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={cn(
      "p-3 rounded-lg border transition-all duration-300 transform",
      config.bg,
      config.border,
      isLoading ? "animate-pulse" : ""
    )}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{isLoading ? '⏳' : config.icon}</span>
        <p className={cn("text-sm font-medium", config.color)}>
          {isLoading ? 'Checking...' : message}
        </p>
      </div>
    </div>
  );
};

// Password strength indicator
const PasswordStrengthIndicator = ({ strength, score, checks, message, color }: {
  strength: string;
  score: number;
  checks: any;
  message: string;
  color: string;
}) => {
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return { text: 'text-green-600', bg: 'bg-green-500', border: 'border-green-200' };
      case 'yellow':
        return { text: 'text-yellow-600', bg: 'bg-yellow-500', border: 'border-yellow-200' };
      default:
        return { text: 'text-red-600', bg: 'bg-red-500', border: 'border-red-200' };
    }
  };

  const colors = getColorClasses(color);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div 
            className={cn("h-2 rounded-full transition-all duration-500", colors.bg)}
            style={{ width: `${(score / 5) * 100}%` }}
          />
        </div>
        <span className={cn("text-sm font-medium", colors.text)}>
          {message}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        {Object.entries(checks).map(([key, passed]) => (
          <div key={key} className="flex items-center gap-1">
            <span>{passed ? '✅' : '❌'}</span>
            <span className={passed ? 'text-green-600' : 'text-gray-500'}>
              {key === 'length' && '8+ characters'}
              {key === 'uppercase' && 'Uppercase letter'}
              {key === 'lowercase' && 'Lowercase letter'}
              {key === 'number' && 'Number'}
              {key === 'special' && 'Special character'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Real-time validation states
  const [emailStatus, setEmailStatus] = useState<'available' | 'taken' | 'invalid' | 'error' | 'checking' | 'unconfirmed'>('invalid');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  
  const [passwordStrength, setPasswordStrength] = useState({
    strength: 'weak',
    score: 0,
    message: '',
    color: 'red',
    checks: {},
    isValid: false
  });

  const router = useRouter();

  // Debounced email availability check
  const checkEmail = useCallback(async (emailValue: string) => {
    if (!emailValue) {
      setEmailStatus('invalid');
      setEmailMessage('Please enter an email address');
      return;
    }

    if (!emailValue.includes('@')) {
      setEmailStatus('invalid');
      setEmailMessage('Please enter a valid email address');
      return;
    }

    setEmailCheckLoading(true);
    setEmailStatus('checking');
    
    try {
      const result = await checkEmailAvailability(emailValue);
      setEmailStatus(result.status as any);
      setEmailMessage(result.message);
    } catch (error) {
      setEmailStatus('error');
      setEmailMessage('Unable to check email availability');
    } finally {
      setEmailCheckLoading(false);
    }
  }, []);

  // Debounced password strength check
  const checkPassword = useCallback(async (passwordValue: string) => {
    if (!passwordValue) {
      setPasswordStrength({
        strength: 'weak',
        score: 0,
        message: 'Enter a password',
        color: 'red',
        checks: {},
        isValid: false
      });
      return;
    }

    const result = await checkPasswordStrength(passwordValue);
    setPasswordStrength(result);
  }, []);

  // Debounce email checking
  useEffect(() => {
    const timer = setTimeout(() => {
      if (email) {
        checkEmail(email);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [email, checkEmail]);

  // Real-time password checking
  useEffect(() => {
    if (password) {
      checkPassword(password);
    }
  }, [password, checkPassword]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    // Final validations
    if (emailStatus !== 'available') {
      setError('Please use a valid, available email address');
      setIsSubmitting(false);
      return;
    }

    if (!passwordStrength.isValid) {
      setError('Please choose a stronger password');
      setIsSubmitting(false);
      return;
    }

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsSubmitting(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);

      console.log('🚀 Submitting signup with validated email:', email);
      const result = await signUp(formData);
      
      console.log('📊 Signup result:', result);
      
      if (!result.success) {
        setError(result.error || "An error occurred during signup");
        
        // If it's an email error, recheck availability
        if (result.field === 'email') {
          await checkEmail(email);
        }
      } else {
        setSuccess(result.message || "Account created successfully!");
        setTimeout(() => {
          router.push("/auth/sign-up-success");
        }, 2000);
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = emailStatus === 'available' && passwordStrength.isValid && password === repeatPassword && !isSubmitting;

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="shadow-2xl border-0 bg-gradient-to-br from-white to-gray-50">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary-teal to-accent-coral bg-clip-text text-transparent">
            Create Your Account
          </CardTitle>
          <CardDescription className="text-lg text-gray-600">
            Join thousands of users discovering their best selves
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSignUp} className="space-y-6">
            {/* Email Field with Real-time Validation */}
            <div className="space-y-3">
              <Label htmlFor="email" className="text-base font-semibold">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cn(
                  "h-12 text-base transition-all duration-300",
                  emailStatus === 'available' && "border-green-500 focus:border-green-500",
                  (emailStatus === 'taken' || emailStatus === 'unconfirmed') && "border-red-500 focus:border-red-500",
                  emailStatus === 'checking' && "border-blue-500"
                )}
                required
              />
              {email && (
                <StatusIndicator
                  status={emailStatus}
                  message={emailMessage}
                  isLoading={emailCheckLoading}
                />
              )}
            </div>

            {/* Password Field with Strength Indicator */}
            <div className="space-y-3">
              <Label htmlFor="password" className="text-base font-semibold">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(
                  "h-12 text-base transition-all duration-300",
                  passwordStrength.color === 'green' && "border-green-500 focus:border-green-500",
                  passwordStrength.color === 'yellow' && "border-yellow-500 focus:border-yellow-500",
                  passwordStrength.color === 'red' && "border-red-500 focus:border-red-500"
                )}
                required
              />
              {password && (
                <PasswordStrengthIndicator {...passwordStrength} />
              )}
            </div>

            {/* Repeat Password Field */}
            <div className="space-y-3">
              <Label htmlFor="repeat-password" className="text-base font-semibold">Confirm Password</Label>
              <Input
                id="repeat-password"
                type="password"
                placeholder="Repeat your password"
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
                className={cn(
                  "h-12 text-base transition-all duration-300",
                  password && repeatPassword && password === repeatPassword && "border-green-500 focus:border-green-500",
                  password && repeatPassword && password !== repeatPassword && "border-red-500 focus:border-red-500"
                )}
                required
              />
              {password && repeatPassword && (
                <div className={cn(
                  "flex items-center gap-2 p-2 rounded-lg",
                  password === repeatPassword ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"
                )}>
                  <span>{password === repeatPassword ? '✅' : '❌'}</span>
                  <span className="text-sm font-medium">
                    {password === repeatPassword ? 'Passwords match!' : 'Passwords do not match'}
                  </span>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 animate-shake">
                <div className="flex items-center gap-2">
                  <span className="text-red-500 text-xl">🚨</span>
                  <p className="text-red-700 font-semibold">{error}</p>
                </div>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="p-4 rounded-lg bg-green-50 border border-green-200 animate-bounce">
                <div className="flex items-center gap-2">
                  <span className="text-green-500 text-xl">🎉</span>
                  <p className="text-green-700 font-semibold">{success}</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button 
              type="submit" 
              className={cn(
                "w-full h-14 text-lg font-bold transition-all duration-300 transform",
                canSubmit 
                  ? "bg-gradient-to-r from-primary-teal to-accent-coral hover:scale-105 hover:shadow-xl" 
                  : "bg-gray-300 cursor-not-allowed opacity-50",
                isSubmitting && "animate-pulse"
              )}
              disabled={!canSubmit}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating Your Account...
                </div>
              ) : (
                '🚀 Create My Account'
              )}
            </Button>

            {/* Login Link */}
            <div className="text-center pt-4">
              <p className="text-gray-600">
                Already have an account?{" "}
                <Link 
                  href="/auth/login" 
                  className="font-semibold text-primary-teal hover:text-accent-coral transition-colors duration-300 hover:underline"
                >
                  Sign in here →
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
