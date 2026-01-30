import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, User, Eye, EyeOff } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";

const Auth = () => {
  const [authMode, setAuthMode] = useState<"selection" | "signin" | "signup">("selection");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"user" | "admin">("user");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const isNewSignupRef = useRef(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useI18n();

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Check onboarding status
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', session.user.id)
          .single();

        if (profile?.onboarding_completed === false) {
          navigate("/onboarding");
        } else {
          navigate("/");
        }
      }
    };
    
    checkSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && event === 'SIGNED_IN') {
        // Use ref to check if this is a new signup
        setTimeout(async () => {
          if (isNewSignupRef.current) {
            // New signup - check onboarding status
            const { data: profile } = await supabase
              .from('profiles')
              .select('onboarding_completed')
              .eq('id', session.user.id)
              .single();

            if (!profile || profile.onboarding_completed === false) {
              navigate("/onboarding");
            } else {
              navigate("/");
            }
          } else {
            // Existing user signing in - go directly to home
            navigate("/");
          }
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (authMode === "signin") {
        // Login
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        toast({
          title: t("Success"),
          description: t("Login successful!"),
        });
      } else if (authMode === "signup") {
        // Sign up
        if (!displayName.trim()) {
          toast({
            title: t("Error"),
            description: t("Please enter your name"),
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        if (role === "user" && inviteCode !== "superreturn") {
          toast({
            title: t("Error"),
            description: t("Invalid invite code for user registration"),
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        if (role === "admin" && inviteCode !== "upupup") {
          toast({
            title: t("Error"),
            description: t("Invalid admin password"),
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Mark as new signup before the auth call
        isNewSignupRef.current = true;
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              display_name: displayName.trim(),
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          // Assign role via edge function
          const { error: roleError } = await supabase.functions.invoke("assign-user-role", {
            body: { userId: data.user.id, role },
          });

          if (roleError) {
            console.error("Role assignment error:", roleError);
            toast({
              title: t("Error"),
              description: t("Account created but role assignment failed"),
              variant: "destructive",
            });
          } else {
            toast({
              title: t("Success"),
              description: t("Account created successfully!"),
            });
          }
        }
      }
    } catch (error: any) {
      toast({
        title: t("Error"),
        description: error.message || t("An error occurred"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToSelection = () => {
    setAuthMode("selection");
    setEmail("");
    setPassword("");
    setDisplayName("");
    setShowPassword(false);
    setRole("user");
    setInviteCode("");
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-black">
      {/* Video background - use fixed positioning and scale to ensure no white edges */}
      <video 
        autoPlay 
        loop 
        muted 
        playsInline 
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-[100vw] min-h-[100vh] w-auto h-auto object-cover"
        style={{ transform: 'translate(-50%, -50%) scale(1.1)' }}
      >
        <source src="/auth-background.mp4" type="video/mp4" />
      </video>


      {/* Auth card */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          {/* iOS-style glass card */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/50 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] p-8 transition-all duration-500 ease-out min-h-[420px] flex flex-col">
            <div className="text-left mb-6">
              <div className="flex items-center gap-2.5">
                <img src="/favicon.png" alt="AI/Tech Daily Logo" className="w-8 h-8" />
                <h1 className="text-2xl font-normal text-black tracking-tight font-heading">
                  AI/Tech Daily
                </h1>
              </div>
              <p className="text-black/70 text-sm mt-3 tracking-wide">{t("Intuition, Amplified")}</p>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              {authMode === "selection" ? (
                <div className="space-y-3 animate-fade-in">
                  <Button onClick={() => setAuthMode("signin")} className="w-full h-11 rounded-xl bg-black text-white hover:bg-black/80" variant="default">
                    {t("Sign In")}
                  </Button>
                  <Button onClick={() => setAuthMode("signup")} className="w-full h-11 rounded-xl bg-transparent text-black border-0 hover:bg-black/5 text-sm" variant="ghost">
                    {t("Sign Up")}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      {t("Email")}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      variant="ghost"
                      className="bg-background/30 border-white/10 h-11 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      {t("Password")}
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        variant="ghost"
                        className="bg-background/30 border-white/10 h-11 rounded-xl pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {authMode === "signup" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="displayName" className="text-sm font-medium">
                          {t("Your Name")}
                        </Label>
                        <Input
                          id="displayName"
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          required
                          placeholder={t("How should we call you?")}
                          variant="ghost"
                          className="bg-background/30 border-white/10 h-11 rounded-xl"
                        />
                      </div>

                      <div className="space-y-2.5 pt-1">
                        <Label className="text-sm font-medium">{t("Select Your Role")}</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setRole("user")}
                            className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 ${
                              role === "user"
                                ? "border-primary bg-primary/10 shadow-sm"
                                : "border-white/10 bg-background/20 hover:bg-background/30 hover:border-white/20"
                            }`}
                          >
                            <User className="h-5 w-5" />
                            <span className="text-sm font-medium">{t("User")}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRole("admin")}
                            className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 ${
                              role === "admin"
                                ? "border-primary bg-primary/10 shadow-sm"
                                : "border-white/10 bg-background/20 hover:bg-background/30 hover:border-white/20"
                            }`}
                          >
                            <Shield className="h-5 w-5" />
                            <span className="text-sm font-medium">{t("Admin")}</span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="inviteCode" className="text-sm font-medium">
                          {role === "admin" ? t("Admin Password") : t("Invite Code")}
                        </Label>
                        <Input
                          id="inviteCode"
                          type="text"
                          value={inviteCode}
                          onChange={(e) => setInviteCode(e.target.value)}
                          required
                          variant="ghost"
                          className="bg-background/30 border-white/10 h-11 rounded-xl"
                        />
                      </div>
                    </>
                  )}

                  <div className="flex gap-3 pt-3">
                    <Button
                      type="button"
                      onClick={handleBackToSelection}
                      variant="outline"
                      className="flex-1 h-11 rounded-xl bg-background/30 border-white/10 hover:bg-background/50"
                      disabled={loading}
                    >
                      {t("Back")}
                    </Button>
                    <Button type="submit" className="flex-1 h-11 rounded-xl" disabled={loading} loading={loading}>
                      {authMode === "signin" ? t("Sign In") : t("Sign Up")}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 left-0 right-0 z-10 px-6 flex justify-between items-center">
        <Popover>
          <PopoverTrigger asChild>
            <button className="text-xs text-white/70 hover:text-white transition-colors lowercase">
              {t("about")}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2 text-xs bg-transparent border-none shadow-none" align="start">
            <p className="text-white/70">{t("WeChat: Tzzzz0110")}</p>
          </PopoverContent>
        </Popover>
        <span className="text-xs text-white/70">©Zezhou 2026</span>
      </div>
    </div>
  );
};

export default Auth;
