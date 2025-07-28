"use client";

import { cn } from "@/lib/utils";
import { signIn } from "@/app/auth/actions";
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
import { useState } from "react";

// Enhanced status indicator for login
const LoginStatusIndicator = ({ status, message }: { 
  status: 'success' | 'error' | 'credentials' | 'email_confirmation' | 'general'; 
  message: string;
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'success':
        return { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', icon: '✅' };
      case 'credentials':
        return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: '🔐' };
      case 'email_confirmation':
        return { color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', icon: '📧' };
      case 'error':
      case 'general':
      default:
        return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: '🚨' };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={cn(
      "p-4 rounded-lg border transition-all duration-300 animate-bounce-in",
      config.bg,
      config.border
    )}>
      <div className="flex items-center gap-3">
        <span className="text-xl">{config.icon}</span>
        <p className={cn("font-semibold", config.color)}>
          {message}
        </p>
      </div>
      {status === 'email_confirmation' && (
        <div className="mt-2 text-sm text-yellow-700">
          Check your inbox and click the confirmation link to activate your account.
        </div>
      )}
      {status === 'credentials' && (
        <div className="mt-2 text-sm text-red-700">
          Double-check your email and password. Need help?{" "}
          <Link href="/auth/forgot-password" className="underline font-medium hover:text-red-800">
            Reset your password →
          </Link>
        </div>
      )}
    </div>
  );
};

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | 'credentials' | 'email_confirmation' | 'general';
    message: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus(null);

    if (!email || !password) {
      setStatus({
        type: 'error',
        message: 'Please enter both email and password'
      });
      setIsLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);

      console.log('🔐 Attempting sign in for:', email);
      const result = await signIn(formData);
      
      if (!result.success) {
        console.log('❌ Sign in failed:', result.error, result.field);
        setStatus({
          type: result.field as any || 'error',
          message: result.error || 'Sign in failed. Please try again.'
        });
      } else {
        setStatus({
          type: 'success',
          message: '🎉 Welcome back! Redirecting...'
        });
        // Redirect will happen from server action
      }
    } catch (error: unknown) {
      console.error('💥 Sign in error:', error);
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="shadow-2xl border-0 bg-gradient-to-br from-white to-gray-50">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary-teal to-accent-coral bg-clip-text text-transparent">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-lg text-gray-600">
            Sign in to continue your journey of self-discovery
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSignIn} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-3">
              <Label htmlFor="email" className="text-base font-semibold">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 text-base transition-all duration-300 focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                required
              />
            </div>

            {/* Password Field */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-base font-semibold">Password</Label>
                <Link 
                  href="/auth/forgot-password" 
                  className="text-sm text-primary-teal hover:text-accent-coral transition-colors duration-300 font-medium hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 text-base transition-all duration-300 focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                required
              />
            </div>

            {/* Status Message */}
            {status && (
              <LoginStatusIndicator
                status={status.type}
                message={status.message}
              />
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className={cn(
                "w-full h-14 text-lg font-bold transition-all duration-300 transform",
                !isLoading 
                  ? "bg-gradient-to-r from-primary-teal to-accent-coral hover:scale-105 hover:shadow-xl hover:shadow-teal-500/25" 
                  : "bg-gray-300 cursor-not-allowed",
                isLoading && "animate-pulse"
              )}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing you in...
                </div>
              ) : (
                '🚀 Sign In'
              )}
            </Button>

            {/* Sign Up Link */}
            <div className="text-center pt-4">
              <p className="text-gray-600">
                New to SARE?{" "}
                <Link 
                  href="/auth/sign-up" 
                  className="font-semibold text-primary-teal hover:text-accent-coral transition-colors duration-300 hover:underline"
                >
                  Create your account →
                </Link>
              </p>
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-4 text-gray-500 font-medium">Need help?</span>
              </div>
            </div>

            {/* Help Links */}
            <div className="grid grid-cols-2 gap-4 text-center">
              <Link 
                href="/auth/forgot-password"
                className="p-3 rounded-lg border border-gray-200 hover:border-primary-teal hover:bg-primary-teal/5 transition-all duration-300 text-sm font-medium"
              >
                🔑 Reset Password
              </Link>
              <Link 
                href="/contact"
                className="p-3 rounded-lg border border-gray-200 hover:border-accent-coral hover:bg-accent-coral/5 transition-all duration-300 text-sm font-medium"
              >
                💬 Contact Support
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
