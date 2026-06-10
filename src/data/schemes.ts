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
    gender?: "male" | "female" | "all";
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
}

export const schemes: Scheme[] = [];

export const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

export const categories = ["General", "OBC", "SC", "ST", "EWS"];
export const occupations = ["Student", "Farmer", "Self-Employed", "Salaried", "Business", "Unemployed", "Retired"];
