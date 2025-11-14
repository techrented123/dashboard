export interface UserData {
    idPhoto: string | null;
    selfiePhoto: string | null;
  }
  
  export interface VerificationData {
    mrzProbability: { probability: number; page: number; success: number };
    name: string;
    success: boolean;
    value: string;
    visualProbability: { probability: 0; page: number; success: number };
  }
  
  export interface VerificationResultDataType {
    verificationData: Array<VerificationData>;
    idImage: string | null;
  }
  