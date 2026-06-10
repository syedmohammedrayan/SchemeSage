import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useScheme } from "@/hooks/useSchemes";
import { useCreateApplication, useSubmitApplication } from "@/hooks/useApplications";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, UploadCloud, FileText, X, ChevronLeft, Loader2, Landmark, Copy, ShieldCheck, ArrowRight, User, ExternalLink, ArrowUpRight, Eye, Edit2, Save } from "lucide-react";

interface FormData {
  fullName: string;
  mobile: string;
  aadhaar: string;
  state: string;
  address: string;
}

interface UploadedDoc {
  name: string;
  type: string;
  id?: string;
  url?: string;
}

export default function ApplyScheme() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: scheme, isLoading: schemeLoading } = useScheme(id || "");
  const createMutation = useCreateApplication();
  const submitMutation = useSubmitApplication();
  
  const [step, setStep] = useState(1);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    mobile: "",
    aadhaar: "",
    state: "",
    address: ""
  });
  
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trackingId, setTrackingId] = useState("");
  const [editingDocId, setEditingDocId] = useState<number | null>(null);
  const [tempDocName, setTempDocName] = useState("");

  const handleNext = async () => {
    if (step === 1) {
      if (!formData.fullName || !formData.mobile || !formData.aadhaar) {
        toast({ title: "Incomplete Details", description: "Please fill all required personal information fields.", variant: "destructive" });
        return;
      }
      
      try {
        if (!applicationId && scheme) {
          const res = await createMutation.mutateAsync({
            schemeId: scheme.id,
            schemeName: scheme.name,
            formData
          });
          setApplicationId(res.application.id);
        }
      } catch (err) {
        toast({ title: "Save Failed", description: "Could not initialize application. Please try again.", variant: "destructive" });
        return;
      }
    }
    
    if (step === 2 && uploadedDocs.length === 0) {
       toast({ title: "Documents Required", description: "Please upload at least one required document to proceed.", variant: "destructive" });
       return;
    }
    setStep(s => s + 1);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', selectedCategory || 'Other'); 
      
      const res = await api.upload<{ document: any }>('/documents/upload', formData);
      
      setUploadedDocs(prev => [...prev, { 
        name: res.document.fileName, 
        type: selectedCategory || 'Other',
        id: res.document.id,
        url: res.document.url
      }]);
      
      setSelectedCategory(""); // Reset for next file
      
      toast({ title: "Document Uploaded", description: `${file.name} securely attached.` });
    } catch (err: any) {
      toast({ 
        title: "Upload Failed", 
        description: err.message || "Could not upload document. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setIsUploading(false);
    }
  };

  const submitApplication = async () => {
    if (!applicationId) return;
    
    setIsSubmitting(true);
    try {
      const res = await submitMutation.mutateAsync({
        id: applicationId,
        documents: uploadedDocs,
        type: 'free'
      });
      
      setTrackingId(res.application.trackingId || `GOV-${Math.random().toString(36).substr(2, 9).toUpperCase()}`);
      setStep(4);
      toast({ title: "Success!", description: "Your application has been submitted successfully." });
    } catch (err: any) {
      toast({ title: "Submission Failed", description: err.message || "An error occurred while submitting.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyTracking = () => {
    navigator.clipboard.writeText(trackingId);
    toast({ title: "Tracking ID Copied", description: "You can use this to track your application status." });
  };

  if (schemeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 text-accent animate-spin mb-4" />
          <p className="text-white font-medium">Initializing Secure Gateway...</p>
        </div>
      </div>
    );
  }

  if (!scheme) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a]">
        <X className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-2xl text-white font-bold mb-2">Scheme Unavailable</h2>
        <Button onClick={() => navigate(-1)} variant="outline">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white py-12 px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[400px] bg-accent/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="container max-w-4xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <Button variant="ghost" onClick={() => step > 1 && step < 4 ? setStep(s => s-1) : navigate(-1)} className="text-slate-400 hover:text-white">
            <ChevronLeft className="h-4 w-4 mr-2" /> {step > 1 && step < 4 ? 'Back to Previous Step' : 'Exit Application'}
          </Button>
          
          {step < 4 && (
            <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 px-4 py-1.5 rounded-full">
              <ShieldCheck className="h-4 w-4 text-green-500" />
              <span className="text-[10px] sm:text-xs font-bold text-green-500 uppercase tracking-widest">End-to-End Encrypted Secure Application</span>
            </div>
          )}
        </div>

        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/10 pb-6">
           <div>
             <CardTitle className="text-3xl md:text-4xl font-heading font-bold text-white mb-2">{scheme.name}</CardTitle>
             <div className="flex items-center gap-2 text-accent">
               <Landmark className="h-4 w-4" />
               <span className="font-semibold text-sm tracking-wide uppercase">{scheme.ministry}</span>
             </div>
           </div>
           
          {/* Progress Stepper Base */}
          {step < 5 && (
            <div className="flex flex-col items-end gap-2 text-right">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Step {step} of 4</div>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-12 rounded-full transition-all duration-500 ${step >= 1 ? 'bg-accent' : 'bg-slate-800'}`} />
                <div className={`h-2 w-12 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-accent' : 'bg-slate-800'}`} />
                <div className={`h-2 w-12 rounded-full transition-all duration-500 ${step >= 3 ? 'bg-accent' : 'bg-slate-800'}`} />
                <div className={`h-2 w-12 rounded-full transition-all duration-500 ${step >= 4 ? 'bg-accent' : 'bg-slate-800'}`} />
              </div>
            </div>
          )}
        </div>

        {/* MULTI-STEP WIZARD */}
        <Card className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
           
           {/* STEP 1: Personal Details */}
           {step === 1 && (
             <CardContent className="p-8 bg-[#0f172a]/80">
               <h3 className="text-3xl font-bold mb-8 text-white flex items-center gap-4">
                 <div className="bg-accent text-white h-10 w-10 rounded-xl flex items-center justify-center text-lg shadow-lg shadow-accent/20">1</div>
                 Applicant Details
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-3">
                   <Label className="text-slate-200 font-semibold text-sm">Full Name (As per Aadhaar) <span className="text-accent">*</span></Label>
                   <Input 
                    placeholder="Enter full name" 
                    value={formData.fullName} 
                    onChange={e => setFormData({...formData, fullName: e.target.value})} 
                    className="bg-[#020617] border-white/10 h-12 text-white placeholder:text-slate-500 focus:border-accent transition-all"
                   />
                 </div>
                 <div className="space-y-3">
                   <Label className="text-slate-200 font-semibold text-sm">Mobile Number <span className="text-accent">*</span></Label>
                   <Input 
                    type="number" 
                    placeholder="10-digit number" 
                    value={formData.mobile} 
                    onChange={e => setFormData({...formData, mobile: e.target.value})} 
                    className="bg-[#020617] border-white/10 h-12 text-white placeholder:text-slate-500 focus:border-accent transition-all"
                   />
                 </div>
                 <div className="space-y-3">
                   <Label className="text-slate-200 font-semibold text-sm">Aadhaar / Virtual ID <span className="text-accent">*</span></Label>
                   <Input 
                    placeholder="12-digit Aadhaar" 
                    value={formData.aadhaar} 
                    onChange={e => setFormData({...formData, aadhaar: e.target.value})} 
                    className="bg-[#020617] border-white/10 h-12 text-white placeholder:text-slate-500 focus:border-accent transition-all"
                   />
                 </div>
                 <div className="space-y-3">
                   <Label className="text-slate-200 font-semibold text-sm">Resident State</Label>
                   <Select value={formData.state} onValueChange={v => setFormData({...formData, state: v})}>
                     <SelectTrigger className="bg-[#020617] border-white/10 h-12 text-white">
                        <SelectValue placeholder="Select State" />
                     </SelectTrigger>
                     <SelectContent className="bg-slate-900 border-white/20 text-white max-h-[300px] overflow-y-auto">
                        <SelectItem value="AP">Andhra Pradesh</SelectItem>
                        <SelectItem value="AR">Arunachal Pradesh</SelectItem>
                        <SelectItem value="AS">Assam</SelectItem>
                        <SelectItem value="BR">Bihar</SelectItem>
                        <SelectItem value="CG">Chhattisgarh</SelectItem>
                        <SelectItem value="GA">Goa</SelectItem>
                        <SelectItem value="GJ">Gujarat</SelectItem>
                        <SelectItem value="HR">Haryana</SelectItem>
                        <SelectItem value="HP">Himachal Pradesh</SelectItem>
                        <SelectItem value="JH">Jharkhand</SelectItem>
                        <SelectItem value="KA">Karnataka</SelectItem>
                        <SelectItem value="KL">Kerala</SelectItem>
                        <SelectItem value="MP">Madhya Pradesh</SelectItem>
                        <SelectItem value="MH">Maharashtra</SelectItem>
                        <SelectItem value="MN">Manipur</SelectItem>
                        <SelectItem value="ML">Meghalaya</SelectItem>
                        <SelectItem value="MZ">Mizoram</SelectItem>
                        <SelectItem value="NL">Nagaland</SelectItem>
                        <SelectItem value="OR">Odisha</SelectItem>
                        <SelectItem value="PB">Punjab</SelectItem>
                        <SelectItem value="RJ">Rajasthan</SelectItem>
                        <SelectItem value="SK">Sikkim</SelectItem>
                        <SelectItem value="TN">Tamil Nadu</SelectItem>
                        <SelectItem value="TS">Telangana</SelectItem>
                        <SelectItem value="TR">Tripura</SelectItem>
                        <SelectItem value="UP">Uttar Pradesh</SelectItem>
                        <SelectItem value="UK">Uttarakhand</SelectItem>
                        <SelectItem value="WB">West Bengal</SelectItem>
                        <SelectItem value="DL">Delhi (UT)</SelectItem>
                        <SelectItem value="JK">Jammu & Kashmir (UT)</SelectItem>
                        <SelectItem value="LD">Ladakh (UT)</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 <div className="space-y-3 md:col-span-2">
                   <Label className="text-slate-200 font-semibold text-sm">Permanent Address</Label>
                   <Input 
                    placeholder="Complete residential address" 
                    value={formData.address} 
                    onChange={e => setFormData({...formData, address: e.target.value})} 
                    className="bg-[#020617] border-white/10 h-12 text-white placeholder:text-slate-500 focus:border-accent transition-all"
                   />
                 </div>
               </div>
               
               <div className="mt-10 flex justify-end">
                 <Button onClick={handleNext} variant="accent" size="lg" className="rounded-xl px-10 h-14 text-md font-bold shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                   Save & Proceed <ArrowRight className="ml-2 h-5 w-5" />
                 </Button>
               </div>
             </CardContent>
           )}

           {/* STEP 2: Document Evidences */}
           {step === 2 && (
             <CardContent className="p-8 bg-[#0f172a]/80">
               <h3 className="text-3xl font-bold mb-2 flex items-center gap-4 text-white">
                 <div className="bg-accent text-white h-10 w-10 rounded-xl flex items-center justify-center text-lg shadow-lg shadow-accent/20">2</div>
                 Document Evidences
               </h3>
               <p className="text-slate-400 mb-8 ml-14">Securely upload the required documents for verification.</p>

               <div className="space-y-4 mb-8 ml-14 max-w-sm">
                 <Label className="text-slate-400 text-xs font-bold uppercase tracking-widest pl-1">Document Category <span className="text-accent">*</span></Label>
                 <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                   <SelectTrigger className="bg-[#020617] border-white/10 h-12 text-white rounded-xl">
                     <SelectValue placeholder="What are you uploading?" />
                   </SelectTrigger>
                   <SelectContent className="bg-slate-900 border-white/20 text-white">
                     {(scheme.documents || ['Aadhaar Card', 'Income Certificate', 'Other']).map((d: string) => (
                       <SelectItem key={d} value={d}>{d}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>

               <div className="space-y-4 mb-8">
                 <div className="bg-[#020617] border border-accent/20 rounded-2xl p-5 shadow-inner">
                   <p className="text-accent text-sm font-bold mb-3 flex items-center gap-2">
                     <FileText className="h-4 w-4" /> Required for {scheme.name}:
                   </p>
                   <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-100">
                     {scheme.documents?.map((d:string) => (
                       <li key={d} className="flex items-center gap-2 bg-white/5 p-2 rounded-lg">
                          <CheckCircle className="h-3 w-3 text-green-500" /> {d}
                       </li>
                     )) || (
                       <>
                         <li className="flex items-center gap-2 bg-white/5 p-2 rounded-lg"><CheckCircle className="h-3 w-3 text-green-500" /> Aadhaar Card</li>
                         <li className="flex items-center gap-2 bg-white/5 p-2 rounded-lg"><CheckCircle className="h-3 w-3 text-green-500" /> Income Certificate</li>
                       </>
                     )}
                   </ul>
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                 <label className="flex flex-col items-center justify-center w-full h-56 border-2 border-dashed border-white/20 rounded-2xl cursor-pointer hover:border-accent hover:bg-accent/5 transition-all relative overflow-hidden group bg-[#020617]">
                    {isUploading ? (
                      <div className="text-center space-y-4 z-10">
                        <Loader2 className="h-10 w-10 animate-spin text-accent mx-auto" />
                        <p className="text-sm font-bold animate-pulse text-accent tracking-widest uppercase">Encrypting file...</p>
                      </div>
                    ) : (
                      <div className="text-center z-10 p-6">
                        <div className="bg-accent/10 h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:-translate-y-2 transition-transform">
                          <UploadCloud className="h-8 w-8 text-accent" />
                        </div>
                        <p className="font-bold text-white text-lg">Tap to browse files</p>
                        <p className="text-xs text-slate-500 mt-2 font-medium">PDF, JPG, PNG up to 5MB</p>
                      </div>
                    )}
                    <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.png,.jpg,.jpeg" disabled={isUploading} />
                 </label>

                 <div className="bg-[#020617] border border-white/10 rounded-2xl p-5 flex flex-col gap-3 max-h-56 overflow-y-auto shadow-inner">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Uploaded Vault</p>
                    {uploadedDocs.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2">
                        <ShieldCheck className="h-8 w-8 opacity-20" />
                        <p className="italic text-sm">No files in secure vault.</p>
                      </div>
                    ) : (
                      uploadedDocs.map((doc, i) => (
                        <div key={i} className="flex items-center justify-between bg-[#0f172a] border border-white/5 p-4 rounded-xl animate-in slide-in-from-right-4 hover:border-accent/40 transition-colors group">
                          <div className="flex items-center gap-3 overflow-hidden flex-1">
                            <div className="bg-accent/20 p-2 rounded-lg shrink-0">
                              <FileText className="h-5 w-5 text-accent" />
                            </div>
                            
                            {editingDocId === i ? (
                              <div className="flex items-center gap-2 flex-1">
                                <input 
                                  value={tempDocName} 
                                  onChange={e => setTempDocName(e.target.value)}
                                  className="bg-black/40 border border-white/20 rounded px-2 py-1 text-sm text-white w-full h-8"
                                  autoFocus
                                />
                                <button 
                                  onClick={() => {
                                    const newDocs = [...uploadedDocs];
                                    newDocs[i].name = tempDocName;
                                    setUploadedDocs(newDocs);
                                    setEditingDocId(null);
                                  }}
                                  className="text-green-500 hover:text-green-400 p-1"
                                >
                                  <Save className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col overflow-hidden">
                                <span 
                                  className="text-sm font-semibold text-white truncate cursor-pointer hover:text-accent transition-colors"
                                  onClick={() => doc.url && window.open(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}${doc.url}`, '_blank')}
                                >
                                  {doc.name}
                                </span>
                                <span className="text-[10px] text-slate-500 uppercase tracking-tighter">{doc.type}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {doc.url && !editingDocId && (
                              <button 
                                onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}${doc.url}`, '_blank')}
                                className="text-slate-400 hover:text-white p-1.5 bg-white/5 rounded-md transition-colors"
                                title="View Document"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            )}
                            {editingDocId !== i && (
                              <button 
                                onClick={() => {
                                  setEditingDocId(i);
                                  setTempDocName(doc.name);
                                }}
                                className="text-slate-400 hover:text-white p-1.5 bg-white/5 rounded-md transition-colors"
                                title="Rename"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            )}
                            <button 
                              onClick={() => setUploadedDocs(prev => prev.filter((_, idx)=>idx!==i))} 
                              className="text-slate-500 hover:text-red-400 p-1.5 bg-white/5 rounded-md transition-colors"
                              title="Delete"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                 </div>
               </div>

               <div className="flex justify-between items-center bg-[#020617] p-6 rounded-2xl border border-white/10 mb-8 sm:flex-row flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-500/20 p-2 rounded-xl">
                      <ShieldCheck className="h-6 w-6 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Encryption Active</p>
                      <p className="text-[10px] text-slate-500">Documents are shredded and encrypted locally.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <Button onClick={() => setStep(1)} variant="outline" className="border-white/10 rounded-xl h-12 px-8 text-white hover:bg-white/5">Previous</Button>
                    <Button onClick={handleNext} variant="accent" size="lg" className="rounded-xl px-10 h-12 font-bold shadow-lg shadow-accent/20">
                      Select Service <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
               </div>
            </CardContent>
           )}

           {/* STEP 3: Service Selection */}
           {step === 3 && (
             <CardContent className="p-8 bg-[#0f172a]/80">
                <h3 className="text-3xl font-bold mb-2 flex items-center gap-4 text-white">
                  <div className="bg-accent text-white h-10 w-10 rounded-xl flex items-center justify-center text-lg shadow-lg shadow-accent/20">3</div>
                  Service Selection
                </h3>
                <p className="text-slate-400 mb-8 ml-14">Choose how you want to process this application.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ml-14">
                  <div 
                    className="cursor-pointer transition-all border-2 border-white/5 bg-slate-950 p-6 rounded-2xl hover:border-blue-400/40 group relative flex flex-col"
                    onClick={() => {
                      const url = scheme.applyLink || (scheme as any).officialLink || "#";
                      window.open(url, "_blank");
                    }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-blue-500/10 p-3 rounded-xl"><ExternalLink className="h-6 w-6 text-blue-400" /></div>
                      <Badge variant="outline" className="text-blue-400 border-blue-400/20">OFFICIAL PORTAL</Badge>
                    </div>
                    <h4 className="text-xl font-bold text-white mb-2">Direct Manual Apply</h4>
                    <p className="text-sm text-slate-400 leading-relaxed mb-4 flex-grow">
                      Redirect to the official government website. No assistance or platform tracking provided.
                    </p>
                    <div className="flex items-center gap-1.5 text-blue-400 text-[10px] font-black uppercase tracking-widest mt-auto">
                      Go to Govt Portal <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                  </div>

                  <Card 
                    className={`cursor-pointer transition-all border-2 ${trackingId === 'assisted' ? 'border-accent bg-accent/5 shadow-lg shadow-accent/10' : 'border-white/5 bg-slate-950'} p-6 rounded-2xl hover:border-accent/40 flex flex-col`} 
                    onClick={() => setTrackingId('assisted')}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-accent/20 p-3 rounded-xl"><ShieldCheck className="h-6 w-6 text-accent" /></div>
                      <Badge className="bg-accent text-white border-0">₹499</Badge>
                    </div>
                    <h4 className="text-xl font-bold text-white mb-2">Agent Assisted</h4>
                    <p className="text-sm text-slate-400 leading-relaxed mb-4 flex-grow">A professional field agent will handle your entire application, verify documents, and guarantee a 5-day filing.</p>
                    <ul className="space-y-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      <li className="flex items-center gap-2 text-accent/80"><CheckCircle className="h-3 w-3" /> Dedicated Case Officer</li>
                      <li className="flex items-center gap-2 text-accent/80"><CheckCircle className="h-3 w-3" /> Verification Guarantee</li>
                    </ul>
                  </Card>
                </div>

                <div className="mt-12 flex justify-end gap-4">
                   <Button onClick={() => setStep(2)} variant="outline" className="border-white/10 h-12 px-8">Previous</Button>
                   <Button 
                    disabled={!trackingId} 
                    onClick={() => setStep(4)} 
                    variant="accent" 
                    className="h-12 px-10 font-bold"
                   >
                     Preview Application <ArrowRight className="ml-2 h-4 w-4" />
                   </Button>
                </div>
             </CardContent>
           )}

           {/* STEP 4: Review & Payment */}
           {step === 4 && (
             <CardContent className="p-8 bg-[#0f172a]/80">
              <h3 className="text-3xl font-bold mb-8 text-white flex items-center gap-4">
                <div className="bg-accent text-white h-10 w-10 rounded-xl flex items-center justify-center text-lg shadow-lg shadow-accent/20">4</div>
                Final Review & Payment
              </h3>
              
              <div className="rounded-3xl border border-white/10 bg-[#020617] p-8 mb-8 shadow-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-8 mb-8">
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-accent font-black uppercase tracking-[0.2em] mb-2">Applicant Identity</p>
                    <p className="text-xl font-bold text-white">{formData.fullName}</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-accent font-black uppercase tracking-[0.2em] mb-2">Service Level</p>
                    <p className="text-xl font-bold text-white uppercase tracking-wider">{trackingId === 'assisted' ? 'Premium Assisted' : 'Standard Free'}</p>
                  </div>
                </div>

                {trackingId === 'assisted' && (
                  <div className="bg-accent/5 border border-accent/20 rounded-2xl p-6 mb-8 mt-4">
                     <p className="text-xs font-black text-accent uppercase tracking-widest mb-4">Professional Service Fee</p>
                     <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl">
                        <span className="text-slate-300 font-medium">Platform Fee + GST</span>
                        <span className="text-2xl font-black text-white">₹499.00</span>
                     </div>
                  </div>
                )}

                <div className="mt-8 pt-8 border-t border-white/10">
                  <label className="flex items-start gap-4 cursor-pointer group p-5 rounded-2xl bg-white/5 border border-white/5">
                    <div className="mt-1">
                      <input type="checkbox" className="w-5 h-5 rounded border-accent bg-transparent text-accent" required id="consent-check" />
                    </div>
                    <span className="text-sm text-slate-300 leading-relaxed font-medium">
                      I confirm that the details provided are accurate. {trackingId === 'assisted' ? 'I agree to the service terms for professional assistance.' : ''}
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-between gap-6">
                <Button onClick={() => setStep(3)} variant="outline" className="h-14 px-8 border-white/10">Back</Button>
                <Button 
                  onClick={async () => {
                    const check = document.getElementById('consent-check') as HTMLInputElement;
                    if (!check?.checked) {
                      toast({ title: "Action Required", description: "Please accept the declaration to proceed.", variant: "destructive" });
                      return;
                    }
                    
                    setIsSubmitting(true);
                    try {
                      const res = await submitMutation.mutateAsync({
                        id: applicationId!,
                        documents: uploadedDocs,
                        type: trackingId === 'assisted' ? 'assisted' : 'free',
                        paymentStatus: trackingId === 'assisted' ? 'paid' : 'na'
                      });
                      setTrackingId(res.application.trackingId);
                      setStep(5);
                    } catch (e: any) {
                      toast({ title: "Process Failed", description: e.message, variant: "destructive" });
                    } finally {
                      setIsSubmitting(false);
                    }
                  }} 
                  variant="accent" 
                  className="rounded-2xl h-14 font-black text-lg flex-1 shadow-xl shadow-accent/30"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <><Loader2 className="h-6 w-6 animate-spin mr-3" /> SECURING SUBMISSION...</>
                  ) : (
                    <span>{trackingId === 'assisted' ? 'SECURE PAY & SUBMIT' : 'CONFIRM & SUBMIT'}</span>
                  )}
                </Button>
              </div>
            </CardContent>
           )}

           {/* STEP 5: Success & Tracking */}
           {step === 5 && (
             <CardContent className="p-12 text-center">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-green-500 blur-xl opacity-20 rounded-full" />
                  <CheckCircle className="h-24 w-24 text-green-500 relative z-10" />
                </div>
                
                <h2 className="text-3xl font-heading font-bold text-white mb-4">Application Submitted!</h2>
                <p className="text-slate-400 max-w-md mx-auto mb-8 text-lg">
                  Your application for <strong className="text-white">{scheme.name}</strong> has been successfully forwarded.
                </p>

                <div className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 max-w-sm mx-auto mb-8 shadow-inner shadow-black/50">
                  <p className="text-xs text-slate-400 uppercase tracking-widest mb-2 font-bold">Your Tracking Reference ID</p>
                  <div className="flex items-center justify-between gap-4 bg-black/40 rounded-xl p-3 border border-white/5">
                    <span className="font-mono text-xl font-bold text-accent tracking-wider ml-2">{trackingId}</span>
                    <Button onClick={copyTracking} size="icon" variant="ghost" className="hover:bg-white/10 text-slate-300">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-center gap-4">
                   <Button variant="outline" onClick={() => navigate('/dashboard')} className="border-white/10 rounded-xl h-12 px-8">
                     Back to Dashboard
                   </Button>
                   <Button variant="accent" onClick={() => navigate('/dashboard')} className="rounded-xl h-12 px-8 shadow-lg shadow-accent/20">
                     Track Status
                   </Button>
                </div>
             </CardContent>
           )}
        </Card>
      </div>
    </div>
  );
}
