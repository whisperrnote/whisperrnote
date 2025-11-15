"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { account, sendEmailVerification, completeEmailVerification } from "@/lib/appwrite";
import { useAuth } from "@/components/ui/AuthContext";
import type { Users } from "@/types/appwrite";
import { motion } from "framer-motion";

function EmailVerifyInner() {
  const [user, setUser] = useState<Users | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [emailSent, setEmailSent] = useState<boolean>(false);

  const router = useRouter();
  const { openIDMWindow } = useAuth();
  const searchParams = useSearchParams();
  const userId = searchParams?.get("userId") || "";
  const secret = searchParams?.get("secret") || "";

  // Handle verification link (userId & secret)
  useEffect(() => {
    const handleVerificationLink = async () => {
      if (userId && secret) {
        setLoading(true);
        setError("");
        setMessage("");
        try {
          await completeEmailVerification(userId, secret);
          setMessage("Email verified successfully. Redirecting to notes...");
          setIsVerified(true);
          setTimeout(() => router.replace("/notes"), 1500);
        } catch (err: any) {
          setError(err?.message || "Failed to verify email");
        } finally {
          setLoading(false);
        }
      }
    };
    handleVerificationLink();
     
  }, [userId, secret, router]);

  // Get current user and check verification status
  useEffect(() => {
    account.get()
      .then(u => {
        setUser(u as unknown as Users);
        if (u.emailVerification) {
          setIsVerified(true);
          // If already verified and no params, redirect to notes
          if (!userId && !secret) {
            setTimeout(() => router.replace("/notes"), 2000);
          }
        }
      })
      .catch(() => {
        openIDMWindow();
      });
  }, [router, userId, secret]);

  const handleSendVerification = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await sendEmailVerification(window.location.origin + "/verify");
      setEmailSent(true);
      setMessage("Verification email sent! Please check your inbox.");
    } catch (err: any) {
      setError(err?.message || "Failed to send verification email");
    } finally {
      setLoading(false);
    }
  };

  // If handling verification link, show loading/message
  if (userId && secret) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          <div className="backdrop-blur-lg bg-light-card/95 dark:bg-dark-card/95 rounded-3xl shadow-3d-light dark:shadow-3d-dark border border-light-border/20 dark:border-dark-border/20 overflow-hidden">
            <div className="p-6">
              {/* Logo */}
              <div className="flex justify-center mb-6">
                <img 
                  src="/logo/whisperrnote.png" 
                  alt="WhisperrNote Logo" 
                  className="w-16 h-16 rounded-2xl shadow-card-light dark:shadow-card-dark" 
                />
              </div>
              
              {/* Header */}
              <h2 className="text-2xl font-bold text-center text-foreground mb-6">
                {loading ? "Verifying Email..." : "Email Verification"}
              </h2>
              
              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-100/80 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl mb-4 shadow-inner-light dark:shadow-inner-dark"
                >
                  {error}
                </motion.div>
              )}
              
              {/* Success Message */}
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-100/80 dark:bg-green-900/30 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-3 rounded-xl mb-4 shadow-inner-light dark:shadow-inner-dark"
                >
                  {message}
                </motion.div>
              )}
              
              {/* Loading State */}
              {loading && (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Otherwise, show send verification email UI
  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="backdrop-blur-lg bg-light-card/95 dark:bg-dark-card/95 rounded-3xl shadow-3d-light dark:shadow-3d-dark border border-light-border/20 dark:border-dark-border/20 overflow-hidden">
          <div className="p-6">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <img 
                src="/logo/whisperrnote.png" 
                alt="WhisperrNote Logo" 
                className="w-16 h-16 rounded-2xl shadow-card-light dark:shadow-card-dark" 
              />
            </div>
            
            {/* Header */}
            <h2 className="text-2xl font-bold text-center text-foreground mb-2">
              {user?.name ? `Welcome, ${user.name}` : "Verify Email"}
            </h2>
            
            {/* Show user email */}
            {user?.email && (
              <p className="text-center text-accent font-medium mb-2">
                {user.email}
              </p>
            )}
            
            <p className="text-center text-muted mb-6">
              {isVerified
                ? "Your email is already verified. Redirecting to notes..."
                : emailSent
                  ? "A verification email has been sent to your address. Please check your inbox and follow the instructions."
                  : "Click the button below to send a verification email to your address."}
            </p>
            
            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-100/80 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl mb-4 shadow-inner-light dark:shadow-inner-dark"
              >
                {error}
              </motion.div>
            )}
            
            {/* Success Message */}
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-100/80 dark:bg-green-900/30 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-3 rounded-xl mb-4 shadow-inner-light dark:shadow-inner-dark"
              >
                {message}
              </motion.div>
            )}
            
            {/* Success Message for Already Verified */}
            {isVerified && !userId && !secret && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-100/80 dark:bg-green-900/30 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-3 rounded-xl mb-4 shadow-inner-light dark:shadow-inner-dark"
              >
                Your email is already verified! Redirecting to your notes...
              </motion.div>
            )}
            
            {/* Send Verification Button */}
            {!isVerified && !emailSent && (
              <form onSubmit={e => e.preventDefault()} className="space-y-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={handleSendVerification}
                  disabled={loading}
                  className="w-full bg-accent hover:bg-accent-hover text-brown-darkest py-2 px-4 rounded-xl font-medium transition-colors shadow-3d-light dark:shadow-3d-dark disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? "Sending..." : "Send Verification Email"}
                </motion.button>
              </form>
            )}
            
            {/* Loading State */}
            {loading && (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
              </div>
            )}
            
            {/* Back Link */}
            <p className="mt-6 text-center">
              <a href="/" className="text-accent hover:text-accent-hover transition-colors font-medium">
                Back to Home
              </a>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function EmailVerifyPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EmailVerifyInner />
    </Suspense>
  );
}
