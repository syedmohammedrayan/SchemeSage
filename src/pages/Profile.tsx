import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Shield, Camera, Mail, Phone, MapPin, User, Calendar,
  ShieldCheck, ChevronLeft, Save, Loader2, Briefcase,
  Hash, Building2, CheckCircle2, Clock, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { indianStates } from "@/data/schemes";

const Profile = () => {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const isAgent = user?.role === 'admin' || user?.role === 'agent';
  const isGov = user?.role === 'government';

  const [formData, setFormData] = useState({
    fullName: user?.fullName || "",
    mobile: user?.mobile || "",
    address: user?.address || "",
    avatarUrl: user?.avatarUrl || "",
    // Agent-specific
    state: user?.state || "",
    district: user?.district || "",
    expertise: user?.expertise || "",
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Please use a file under 2MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, avatarUrl: reader.result as string }));
      setUploading(false);
      toast({ title: "Photo ready", description: "Click Save to apply." });
    };
    reader.onerror = () => { setUploading(false); toast({ title: "Encoding failed", variant: "destructive" }); };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!formData.fullName.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await api.put<{ profile: any }>("/profile", formData);
      setUser({ ...user, ...res.profile });
      toast({ title: "✅ Profile Updated", description: "Your details have been saved to Firebase." });
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message || "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    active: { label: "Active & Verified", color: "bg-green-500/10 text-green-600 border-green-500/20", icon: CheckCircle2 },
    pending: { label: "Pending Approval", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", icon: Clock },
    rejected: { label: "Application Declined", color: "bg-red-500/10 text-red-600 border-red-500/20", icon: Shield },
  };
  const statusInfo = statusConfig[user.status || 'active'] || statusConfig.active;

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-40">
        <div className="container mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Link to="/" className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-accent" />
              <span className="font-heading font-bold text-base">Scheme Sage</span>
            </Link>
          </div>
          <Badge variant="outline" className="text-xs gap-1">
            <ShieldCheck className="h-3 w-3 text-green-500" /> Secure Profile
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Identity Card */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="shadow-card overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-accent to-blue-500" />
              <CardContent className="p-6 text-center">
                {/* Avatar */}
                <div className="relative inline-block mb-4">
                  <Avatar className="h-24 w-24 mx-auto ring-4 ring-accent/20">
                    <AvatarImage src={formData.avatarUrl} className="object-cover" />
                    <AvatarFallback className="text-2xl font-black bg-accent/10 text-accent">
                      {user.fullName?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </div>
                  )}
                  <label className="absolute -bottom-1 -right-1 cursor-pointer z-10">
                    <div className="h-8 w-8 rounded-full bg-accent text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                      <Camera className="h-4 w-4" />
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </label>
                  
                  {formData.avatarUrl && (
                    <button 
                      className="absolute -bottom-1 -left-1 h-8 w-8 rounded-full bg-destructive text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-10"
                      onClick={(e) => {
                        e.preventDefault();
                        setFormData(prev => ({ ...prev, avatarUrl: "" }));
                        toast({ title: "Photo removed", description: "Click Save to apply changes." });
                      }}
                      title="Remove Photo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}

                <h2 className="font-heading font-bold text-lg text-foreground">{user.fullName}</h2>
                <p className="text-sm text-muted-foreground mb-3">{user.email}</p>

                <Badge className="mb-3 capitalize">{user.role}</Badge>

                {/* Status */}
                <div className={`flex items-center justify-center gap-2 text-xs font-medium px-3 py-2 rounded-lg border ${statusInfo.color}`}>
                  <statusInfo.icon className="h-3.5 w-3.5" />
                  {statusInfo.label}
                </div>

                <Separator className="my-4" />

                <div className="text-left space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-accent" />
                    Joined {new Date(user.createdAt || Date.now()).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                  </div>
                  {user.state && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-accent" />
                      {user.state}{user.district ? `, ${user.district}` : ''}
                    </div>
                  )}
                  {user.expertise && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-3.5 w-3.5 text-accent" />
                      {user.expertise}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Read-only credentials (Agents only) */}
            {isAgent && (
              <Card className="shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Official Credentials</CardTitle>
                  <CardDescription className="text-xs">These are verified at registration and cannot be changed.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Aadhar", value: user.aadharNumber ? `XXXX XXXX ${user.aadharNumber.slice(-4)}` : "—" },
                    { label: "PAN", value: user.panNumber ? `XXXXX${user.panNumber.slice(-5)}` : "—" },
                    { label: "MeeSeva / Agent ID", value: user.meeSevaId || "—" },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground font-medium">{item.label}</span>
                      <span className="text-xs font-mono font-bold text-foreground">{item.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Edit Form */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-accent" /> Edit Profile
                </CardTitle>
                <CardDescription>
                  Changes are saved to Firebase and visible to government officials{isAgent ? ' and the public agents directory' : ''}.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Basic Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={formData.fullName}
                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                        className="pl-9"
                        placeholder="Your legal name"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={user.email}
                        disabled
                        className="pl-9 bg-muted/40 text-muted-foreground cursor-not-allowed"
                        placeholder="Email (managed by Firebase)"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mobile Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={formData.mobile}
                        onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                        className="pl-9"
                        placeholder="+91 XXXXX XXXXX"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                        className="pl-9"
                        placeholder="House, Street, City, Pincode"
                      />
                    </div>
                  </div>
                </div>

                {/* Government Jurisdiction */}
                {isGov && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-accent" /> Official Jurisdiction
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Administered State / Level</Label>
                          <Select value={formData.state || "Central"} onValueChange={v => setFormData({ ...formData, state: v })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Jurisdiction" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              <SelectItem value="Central" className="font-bold text-accent">Central / All States</SelectItem>
                              {indianStates.map(s => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Agent-specific fields */}
                {isAgent && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                        <Briefcase className="h-3.5 w-3.5 text-accent" /> Professional Details
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Working State</Label>
                          <Select value={formData.state} onValueChange={v => setFormData({ ...formData, state: v })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {indianStates.map(s => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">District</Label>
                          <div className="relative">
                            <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              value={formData.district}
                              onChange={e => setFormData({ ...formData, district: e.target.value })}
                              className="pl-9"
                              placeholder="Your district"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Area of Expertise</Label>
                          <div className="relative">
                            <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              value={formData.expertise}
                              onChange={e => setFormData({ ...formData, expertise: e.target.value })}
                              className="pl-9"
                              placeholder="e.g. Agriculture, Health"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Save Button */}
                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={handleSave}
                    disabled={loading}
                    variant="accent"
                    size="lg"
                    className="min-w-[160px]"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Save className="h-4 w-4" /> Save to Firebase
                      </span>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Visibility note */}
            <Card className="shadow-card bg-accent/5 border-accent/20">
              <CardContent className="p-4 flex gap-3 items-start">
                <ShieldCheck className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">What gets updated?</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Your details in <strong>Firebase/Firestore</strong> are updated in real time</li>
                    {isGov && <li>• Setting your Jurisdiction ensures you only receive and manage agent requests for your assigned State.</li>}
                    {isAgent && <li>• Government sees your updated profile in the <strong>Agent Management</strong> tab</li>}
                    {isAgent && <li>• Citizens see your updated name, state and expertise in the <strong>public agents directory</strong></li>}
                    <li>• Email is managed by Firebase Auth and cannot be changed here</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
