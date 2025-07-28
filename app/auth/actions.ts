"use server";

import { createClient } from "@/lib/supabase/server";
import { getStorytellerByToken, updateStorytellerByToken } from "@/lib/supabase/database";
import { redirect } from "next/navigation";

// Real-time email availability checker
export async function checkEmailAvailability(email: string) {
  const supabase = await createClient();
  
  if (!email || !email.includes('@')) {
    return { 
      available: false, 
      message: "Please enter a valid email address",
      status: "invalid"
    };
  }

  try {
    // Try to sign in with a dummy password to detect if email exists
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: 'dummy_check_password_12345!@#$%',
    });

    if (error) {
      // If we get these specific errors, email exists
      if (error.message.includes('Invalid login credentials') ||
          error.message.includes('invalid_credentials') ||
          error.code === 'invalid_credentials') {
        return { 
          available: false, 
          message: "This email is already registered. Try logging in instead.",
          status: "taken"
        };
      }
      
      // If email not confirmed, it still exists
      if (error.message.includes('Email not confirmed') ||
          error.code === 'email_not_confirmed') {
        return { 
          available: false, 
          message: "This email is registered but not confirmed. Check your inbox.",
          status: "unconfirmed"
        };
      }
    }

    // If we get here, email is likely available
    return { 
      available: true, 
      message: "Email is available!",
      status: "available"
    };
  } catch (error) {
    console.error("Email check error:", error);
    return { 
      available: false, 
      message: "Unable to verify email availability. Please try again.",
      status: "error"
    };
  }
}

// Enhanced password strength checker
export async function checkPasswordStrength(password: string) {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;
  
  let strength = "weak";
  let message = "Password is too weak";
  let color = "red";

  if (score >= 4) {
    strength = "strong";
    message = "Strong password!";
    color = "green";
  } else if (score >= 3) {
    strength = "medium";
    message = "Good password, but could be stronger";
    color = "yellow";
  }

  return {
    strength,
    score,
    message,
    color,
    checks,
    isValid: score >= 3
  };
}

// Bulletproof signup with multiple validation layers
export async function signUp(formData: FormData) {
  const supabase = await createClient();
  
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const token = formData.get("token") as string | null;

  // Validate input
  if (!email || !password) {
    return { 
      success: false, 
      error: "Email and password are required",
      field: "general"
    };
  }

  // Pre-flight email check
  const emailCheck = await checkEmailAvailability(email);
  if (!emailCheck.available) {
    return { 
      success: false, 
      error: emailCheck.message,
      field: "email",
      status: emailCheck.status
    };
  }

  // Password strength check
  const passwordCheck = await checkPasswordStrength(password);
  if (!passwordCheck.isValid) {
    return { 
      success: false, 
      error: "Password does not meet security requirements",
      field: "password",
      details: passwordCheck
    };
  }

  try {
    console.log('🚀 Starting bulletproof signup for:', email);

    // Triple-check: Attempt signup
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: token 
          ? `${process.env.NEXT_PUBLIC_SITE_URL}/story_submit?token=${token}`
          : `${process.env.NEXT_PUBLIC_SITE_URL}/protected`,
      },
    });

    console.log('📊 Supabase signup response:', { 
      hasUser: !!authData?.user,
      hasSession: !!authData?.session,
      error: authError?.message,
      errorCode: authError?.code
    });

    // Handle explicit auth errors
    if (authError) {
      console.log('❌ Signup failed with error:', authError.code, authError.message);
      
      // Handle all possible duplicate email scenarios
      const duplicateErrorCodes = ['email_exists', 'user_already_exists', 'signup_disabled'];
      const duplicateMessages = [
        'User already registered',
        'already been registered', 
        'already registered',
        'Email address already exists',
        'user with this email already exists'
      ];

      if (duplicateErrorCodes.includes(authError.code!) || 
          duplicateMessages.some(msg => authError.message.toLowerCase().includes(msg.toLowerCase()))) {
        return { 
          success: false, 
          error: "🚫 This email is already in use! Please try logging in or use a different email.",
          field: "email",
          status: "duplicate"
        };
      }
      
      return { 
        success: false, 
        error: authError.message,
        field: "general"
      };
    }

    // Detect fake/obfuscated user responses (Supabase's sneaky behavior)
    if (authData?.user && !authData.session) {
      const user = authData.user;
      
      // Multiple heuristics to detect fake responses
      const isFakeUser = (
        // Same creation and update time (suspicious)
        user.created_at === user.updated_at &&
        // No email confirmation
        !user.email_confirmed_at &&
        // No phone confirmation
        !user.phone_confirmed_at &&
        // Created very recently (within last few seconds)
        new Date(user.created_at).getTime() > (Date.now() - 10000)
      );

      if (isFakeUser) {
        console.log('🕵️ Detected fake user response - email likely exists');
        return { 
          success: false, 
          error: "🚫 This email is already registered! Please try logging in instead.",
          field: "email",
          status: "fake_user_detected"
        };
      }
    }

    // Handle storyteller linking if needed
    if (token && authData?.user) {
      const { data: storyteller, error: storytellerError } = await getStorytellerByToken(token);
      
      if (storytellerError || !storyteller) {
        return { 
          success: false, 
          error: "Invalid invitation token",
          field: "general"
        };
      }

      const { error: updateError } = await updateStorytellerByToken(token, {
        user_id: authData.user.id,
      });

      if (updateError) {
        return { 
          success: false, 
          error: "Failed to link account to invitation",
          field: "general"
        };
      }
    }

    console.log('✅ Signup successful for:', email);
    return { 
      success: true, 
      user: authData.user,
      message: "🎉 Account created successfully! Check your email to confirm."
    };

  } catch (error) {
    console.error("💥 Unexpected signup error:", error);
    return { 
      success: false, 
      error: "An unexpected error occurred. Please try again.",
      field: "general"
    };
  }
}

// Enhanced sign in with better error handling
export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return {
      success: false,
      error: "Email and password are required",
      field: "general"
    };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Provide specific error messages
      if (error.message.includes('Invalid login credentials')) {
        return {
          success: false,
          error: "Invalid email or password. Please check your credentials.",
          field: "credentials"
        };
      }
      
      if (error.message.includes('Email not confirmed')) {
        return {
          success: false,
          error: "Please check your email and confirm your account before signing in.",
          field: "email_confirmation"
        };
      }

      return {
        success: false,
        error: error.message,
        field: "general"
      };
    }

    redirect("/protected");
  } catch (error) {
    console.error("Sign in error:", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
      field: "general"
    };
  }
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
} 