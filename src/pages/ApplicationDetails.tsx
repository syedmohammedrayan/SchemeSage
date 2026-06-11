import { useParams, Link } from "react-router-dom";
import { useApplications } from "@/hooks/useApplications";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, ArrowLeft, CheckCircle, Clock, FileText, User, XCircle, CreditCard, Calendar, CheckSquare } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

const steps = [
  { id: 'submitted', label: 'Submitted', icon: FileText },
  { id: 'in_review', label: 'In Review', icon: FileText },
  { id: 'decision', label: 'Decision', icon: CheckCircle },
];

export default function ApplicationDetails() {
  const { applicationId } = useParams();
  const { data: applications = [], isLoading } = useApplications();
  const { user } = useAuth();

  const app = applications.find((a: any) => a.id === applicationId);

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-muted/30">
        <Activity className="h-10 w-10 text-accent animate-pulse" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-muted/30">
        <h2 className="text-2xl font-bold mb-4">Application Not Found</h2>
        <Button asChild><Link to="/tracking">Return to Tracking</Link></Button>
      </div>
    );
  }

  const isAssisted = app.type === 'assisted';
  
  let currentStep = 0;
  let isError = false;
  if (app.status === 'submitted') currentStep = 1;
  if (app.status === 'in_review' || app.status === 'document_pending') currentStep = 2;
  if (app.status === 'approved') currentStep = 3;
  if (app.status === 'rejected') {
    currentStep = 3;
    isError = true;
  }

  return (
    <div className="min-h-[80vh] bg-slate-50 pb-20">
      <header className="bg-[#020617] text-white pt-10 pb-24 px-4 shadow-xl">
        <div className="container mx-auto max-w-5xl">
          <Button variant="link" asChild className="text-slate-400 hover:text-white p-0 mb-6">
            <Link to="/tracking"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Tracking</Link>
          </Button>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Badge className={`capitalize font-bold ${isAssisted ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                  {isAssisted ? 'Agent Assisted' : 'Manual Application'}
                </Badge>
                <Badge variant="outline" className="border-white/20 text-white font-mono">
                  {app.trackingId || app.id.slice(0, 8).toUpperCase()}
                </Badge>
              </div>
              <h1 className="text-3xl md:text-5xl font-black mb-2">{app.schemeName}</h1>
              <p className="text-slate-400">Submitted on {new Date(app.createdAt).toLocaleDateString()}</p>
            </div>
            <Badge variant="outline" className={`px-4 py-2 text-lg uppercase tracking-widest border-2 ${
              isError ? 'border-red-500 text-red-400' : currentStep === 3 ? 'border-green-500 text-green-400' : 'border-[#f97316] text-[#f97316]'
            }`}>
              {app.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 -mt-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="md:col-span-2 space-y-6">
            {/* Status Timeline Card */}
            <Card className="shadow-lg border-0 ring-1 ring-slate-200">
              <CardHeader className="bg-white border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-lg"><Activity className="h-5 w-5 text-accent" /> Status Timeline</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="relative">
                  <div className="absolute top-5 left-10 right-10 h-1 bg-slate-100 rounded-full">
                    <div 
                      className={`h-full transition-all duration-1000 ${isError ? 'bg-red-500' : 'bg-green-500'}`}
                      style={{ width: `${(Math.max(0, currentStep - 1) / (steps.length - 1)) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between relative z-10">
                    {steps.map((step, index) => {
                      const stepNumber = index + 1;
                      const isActive = currentStep >= stepNumber;
                      const StepIcon = isError && stepNumber === 3 ? XCircle : isActive ? CheckCircle : step.icon;
                      
                      return (
                        <div key={step.id} className="flex flex-col items-center">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm ${
                            isActive ? (isError && stepNumber === 3 ? 'bg-red-500 text-white' : 'bg-green-500 text-white') : 'bg-slate-100 text-slate-400'
                          }`}>
                            <StepIcon className="h-5 w-5" />
                          </div>
                          <span className={`text-xs font-bold mt-2 uppercase ${isActive ? (isError && stepNumber === 3 ? 'text-red-600' : 'text-green-600') : 'text-slate-400'}`}>
                            {stepNumber === 3 && isError ? 'Rejected' : stepNumber === 3 && isActive ? 'Approved' : step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Application Data */}
            <Card className="shadow-lg border-0 ring-1 ring-slate-200">
              <CardHeader className="bg-white border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-lg"><FileText className="h-5 w-5 text-accent" /> Citizen Information</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                  {Object.entries(app.formData || {}).map(([key, value]) => {
                    // Skip internal fields or very long arrays if any
                    if (typeof value === 'object') return null;
                    const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                    return (
                      <div key={key}>
                        <dt className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{formattedKey}</dt>
                        <dd className="text-slate-900 font-medium">{String(value) || '-'}</dd>
                      </div>
                    );
                  })}
                </dl>
              </CardContent>
            </Card>

            {/* Uploaded Documents */}
            {app.documents && app.documents.length > 0 && (
              <Card className="shadow-lg border-0 ring-1 ring-slate-200">
                <CardHeader className="bg-white border-b border-slate-100">
                  <CardTitle className="flex items-center gap-2 text-lg"><CheckSquare className="h-5 w-5 text-accent" /> Uploaded Documents</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-3">
                  {app.documents.map((doc: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-slate-400 p-1.5 bg-white rounded shadow-sm border border-slate-100" />
                        <div>
                          <p className="font-semibold text-sm text-slate-900">{doc.type || 'Document'}</p>
                          <p className="text-xs text-slate-500">Uploaded {new Date(doc.uploadedAt || app.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">Verified</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {/* Agent Info */}
            {isAssisted && (
              <Card className="shadow-lg border-0 ring-1 ring-slate-200 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -mr-10 -mt-10" />
                <CardHeader className="bg-white/50 border-b border-slate-100">
                  <CardTitle className="flex items-center gap-2 text-lg"><User className="h-5 w-5 text-purple-600" /> Agent Information</CardTitle>
                </CardHeader>
                <CardContent className="p-6 relative z-10">
                  {app.agentId && app.agentDetails ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Name</p>
                        <p className="font-bold text-slate-900">{app.agentDetails.fullName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Phone</p>
                        <p className="font-medium text-slate-700">{app.agentDetails.mobile || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Email</p>
                        <p className="font-medium text-slate-700">{app.agentDetails.email || 'Not provided'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Clock className="h-8 w-8 text-slate-300 mx-auto mb-3 animate-pulse" />
                      <p className="text-sm font-bold text-slate-700">Awaiting Assignment</p>
                      <p className="text-xs text-slate-500 mt-1">An agent will review and claim your application shortly.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Payment Info */}
            <Card className="shadow-lg border-0 ring-1 ring-slate-200">
              <CardHeader className="bg-white border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-lg"><CreditCard className="h-5 w-5 text-accent" /> Payment Info</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Method</p>
                    <p className="font-bold text-slate-900">{isAssisted ? 'Agent Assisted (₹249)' : 'Free Manual Application'}</p>
                  </div>
                  {isAssisted && (
                    <div>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Status</p>
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-200 mt-1">Paid Successfully</Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {(app.notes || app.rejectionReason) && (
              <Card className="shadow-lg border-0 ring-1 ring-red-100 bg-red-50/50">
                <CardHeader className="border-b border-red-100">
                  <CardTitle className="flex items-center gap-2 text-lg text-red-800"><Activity className="h-5 w-5" /> Official Notes</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-sm text-red-900 font-medium">{app.rejectionReason || app.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

        </motion.div>
      </main>
    </div>
  );
}
