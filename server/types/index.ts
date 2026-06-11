export interface User {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  password: string;
  state: string;
  district: string;
  role: 'citizen' | 'admin' | 'government';
  age?: number;
  gender?: 'male' | 'female' | 'other';
  occupation?: string;
  annualIncome?: number;
  category?: 'General' | 'OBC' | 'SC' | 'ST' | 'EWS' | 'Minority';
  minority?: boolean;
  disability?: boolean;
  maritalStatus?: 'single' | 'married' | 'widow' | 'divorced' | 'widower';
  ruralUrban?: 'rural' | 'urban';
  educationLevel?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EligibilityDimension {
  /** Hard reject: does not pass */
  pass: boolean;
  /** The dimension name shown in UI */
  label: string;
  /** Short explanation e.g. "Telangana resident ✓" */
  detail: string;
}

export interface SchemeEligibility {
  minAge?: number;
  maxAge?: number;
  maxIncome?: number;
  gender?: 'male' | 'female' | 'all';
  categories?: string[];
  occupations?: string[];
  states?: string[];
  /** e.g. ['graduate', 'postgraduate', 'technical', '10th pass', 'any'] */
  educationLevels?: string[];
  /** true = scheme is exclusively for disabled citizens */
  disabilityRequired?: boolean;
  /** true = scheme is exclusively for minority citizens */
  minorityRequired?: boolean;
  /** e.g. 'rural' | 'urban' | 'both' */
  ruralUrban?: 'rural' | 'urban' | 'both';
  /** e.g. ['widow', 'single', 'married', 'divorced'] */
  maritalStatus?: string[];
}

export interface Scheme {
  id: string;
  name: string;
  ministry: string;
  description: string;
  benefits: string;
  eligibility: SchemeEligibility;
  documents: string[];
  deadline?: string;
  applyLink: string;
  tags: string[];
  views: number;
  saves: number;
  createdAt: string;
}

export interface ScoredScheme extends Scheme {
  matchScore: number;
  eligibilityBreakdown: EligibilityDimension[];
}

export interface SavedScheme {
  id: string;
  userId: string;
  schemeId: string;
  savedAt: string;
}

export interface Application {
  id: string;
  userId: string;
  schemeId: string;
  schemeName: string;
  formData?: Record<string, any>;
  documents?: string[];
  status: 'draft' | 'saved' | 'started' | 'submitted' | 'in_review' | 'approved' | 'rejected';
  agentId?: string;
  paymentStatus?: 'pending' | 'paid';
  type?: 'free' | 'assisted';
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'new_scheme' | 'deadline' | 'update' | 'system';
  read: boolean;
  createdAt: string;
}

export interface UserDocument {
  id: string;
  userId: string;
  documentType: 'aadhaar' | 'income_certificate' | 'caste_certificate' | 'address_proof';
  filePath: string;
  fileName: string;
  uploadedAt: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIRecommendation {
  schemeId: string;
  matchScore: number;
  reason: string;
  breakdown?: EligibilityDimension[];
}

export interface EligibilityResult {
  eligible: boolean;
  confidence: 'high' | 'medium' | 'low';
  explanation: string;
  breakdown?: EligibilityDimension[];
}

export interface CitizenProfile {
  age?: number;
  gender?: string;
  state?: string;
  district?: string;
  occupation?: string;
  annualIncome?: number;
  category?: string;
  minority?: boolean;
  disability?: boolean;
  maritalStatus?: string;
  ruralUrban?: string;
  educationLevel?: string;
  fullName?: string;
}

export interface CitizenReport {
  profile: CitizenProfile;
  profileSummary: string;
  topMatches: Array<{
    scheme: Scheme;
    matchScore: number;
    reason: string;
    breakdown: EligibilityDimension[];
    documents: string[];
  }>;
  partialMatches: Array<{
    scheme: Scheme;
    matchScore: number;
    missingCriteria: string;
  }>;
  generatedAt: string;
}

export interface Agent {
  id: string;
  name: string;
  location: string;
  phone: string;
  expertise: string;
}

export interface AgentRequest {
  id: string;
  agentId: string;
  userId: string;
  userName: string;
  userPhone: string;
  message: string;
  status: 'pending' | 'accepted' | 'resolved';
  createdAt: string;
  state?: string;
}
