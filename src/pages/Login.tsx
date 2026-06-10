import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Shield, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [role, setRole] = useState<"admin" | "government">("admin");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password, role);
      toast({ title: "Welcome back!", description: `Logged in as ${user.fullName}` });
      if (user.role === "admin") navigate("/admin");
      else if (user.role === "government") navigate("/government");
      else navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message || "Invalid credentials", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { value: "admin" as const, label: "Admin / Agent" },
    { value: "government" as const, label: "Government" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-md shadow-elevated border-border/40">
        <CardHeader className="text-center pb-2">
          <Link to="/" className="inline-flex items-center gap-2 justify-center mb-4">
            <Shield className="h-8 w-8 text-accent" />
            <span className="font-heading font-bold text-2xl text-foreground">Scheme Sage</span>
          </Link>
          <h1 className="font-heading font-bold text-2xl text-foreground">Welcome Back</h1>
          <p className="text-sm text-muted-foreground">Sign in to access your dashboard</p>
        </CardHeader>
        <CardContent>
          {/* Role selector */}
          <div className="flex gap-1 bg-secondary rounded-lg p-1 mb-6">
            {roles.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => { setRole(r.value); setEmail(""); setPassword(""); }}
                className={`flex-1 text-sm font-medium py-2 rounded-md transition-all ${
                  role === r.value ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {role === "admin" && (
            <div className="bg-accent/10 border border-accent/20 rounded-lg p-3 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-xs text-foreground/80 leading-relaxed font-medium">
                Official Agent? If you haven't been verified yet, please{" "}
                <Link to="/admin/register" className="text-accent font-extrabold hover:underline underline-offset-2">Apply for a Government License</Link> here.
              </p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" variant="accent" className="w-full" size="lg" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-border/40">
            <p className="text-center text-sm text-muted-foreground">
              Public schemes are available without login.{" "}
              <Link to="/dashboard" className="text-accent font-medium hover:underline">Explore Schemes</Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
