import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const Login = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loginWithGoogle } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-md shadow-elevated border-border/40">
        <CardHeader className="text-center pb-2">
          <Link to="/" className="inline-flex items-center gap-2 justify-center mb-4">
            <Shield className="h-8 w-8 text-accent" />
            <span className="font-heading font-bold text-2xl text-foreground">Scheme Sage</span>
          </Link>
          <h1 className="font-heading font-bold text-2xl text-foreground">Welcome Back</h1>
          <p className="text-sm text-muted-foreground">Sign in to securely apply for schemes</p>
        </CardHeader>
        <CardContent>
          
          <div className="space-y-6 py-4">
            <Button 
              onClick={async () => {
                setLoading(true);
                try {
                  const user = await loginWithGoogle();
                  toast({ title: "Welcome back!", description: `Logged in as ${user.fullName}` });
                  navigate("/eligibility");
                } catch (err: any) {
                  if (err.code !== 'auth/popup-closed-by-user') {
                    console.error("Firebase Google Auth Error:", err);
                    toast({ title: "Login failed", description: err.message || "Could not authenticate with Google", variant: "destructive" });
                  }
                } finally {
                  setLoading(false);
                }
              }} 
              variant="outline" 
              className="w-full h-14 relative font-bold flex items-center justify-center gap-3 border-2 hover:bg-slate-50"
              disabled={loading}
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              {loading ? "Signing In..." : "Sign In with Google"}
            </Button>
          </div>

          <div className="mt-8 pt-6 border-t border-border/40">
            <p className="text-center text-sm text-muted-foreground">
              Public schemes are available without login.{" "}
              <Link to="/discover" className="text-accent font-medium hover:underline">Explore Schemes</Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
