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
  category?: 'General' | 'OBC' | 'SC' | 'ST' | 'EWS';
  createdAt: string;
  updatedAt: string;
}

export interface Scheme {
  id: string;
  name: string;
  ministry: string;
  description: string;
  benefits: string;
  eligibility: {
    minAge?: number;
    maxAge?: number;
    maxIncome?: number;
    gender?: 'male' | 'female' | 'all';
    categories?: string[];
    occupations?: string[];
    states?: string[];
  };
  documents: string[];
  deadline?: string;
  applyLink: string;
  tags: string[];
  views: number;
  saves: number;
  createdAt: string;
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
}

export interface EligibilityResult {
  eligible: boolean;
  confidence: 'high' | 'medium' | 'low';
  explanation: string;
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
}
