// Custom SRP-based authentication service for AWS Cognito
// NOTE: This file is currently unused as the app uses AWS Amplify Auth instead
// The functions below are kept for potential future use but are commented out

/*
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { calculateSrpA, calculateSrpClientEvidenceM1 } from "./srp";

const client = new CognitoIdentityProviderClient({
  region: import.meta.env.VITE_AWS_REGION,
});

export const signUp = async (
  username: string,
  password: string,
  email: string
) => {
  try {
    const command = new SignUpCommand({
      ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
      Username: username,
      Password: password,
      UserAttributes: [
        {
          Name: "email",
          Value: email,
        },
      ],
    });

    const response = await client.send(command);
    return response;
  } catch (error) {
    console.error("Sign up error:", error);
    throw error;
  }
};

export const confirmSignUp = async (
  username: string,
  confirmationCode: string
) => {
  try {
    const command = new ConfirmSignUpCommand({
      ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
      Username: username,
      ConfirmationCode: confirmationCode,
    });

    const response = await client.send(command);
    return response;
  } catch (error) {
    console.error("Confirm sign up error:", error);
    throw error;
  }
};

export const signIn = async (username: string, password: string) => {
  try {
    // Step 1: Initiate SRP authentication
    const command = new InitiateAuthCommand({
      ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
      AuthFlow: "USER_SRP_AUTH",
      AuthParameters: {
        USERNAME: username.toLowerCase(),
        SRP_A: calculateSrpA(username.toLowerCase()),
      },
    });

    const initiateResponse = await client.send(command);

    // Step 2: Handle PASSWORD_VERIFIER challenge
    if (initiateResponse.ChallengeName === "PASSWORD_VERIFIER") {
      const challengeResponse = new RespondToAuthChallengeCommand({
        ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
        ChallengeName: "PASSWORD_VERIFIER",
        Session: initiateResponse.Session,
        ChallengeResponses: {
          USERNAME: username.toLowerCase(),
          PASSWORD_CLAIM_SECRET_BLOCK:
            initiateResponse.ChallengeParameters!.SECRET_BLOCK,
          PASSWORD_CLAIM_SIGNATURE: await calculateSrpClientEvidenceM1(
            username.toLowerCase(),
            password,
            initiateResponse.ChallengeParameters!.SALT,
            initiateResponse.ChallengeParameters!.SRP_B,
            initiateResponse.ChallengeParameters!.SECRET_BLOCK
          ),
        },
      });

      const finalResponse = await client.send(challengeResponse);
      return finalResponse;
    }

    return initiateResponse;
  } catch (error) {
    console.error("Sign in error:", error);
    throw error;
  }
};

export const forgotPassword = async (username: string) => {
  try {
    const command = new ForgotPasswordCommand({
      ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
      Username: username,
    });

    const response = await client.send(command);
    return response;
  } catch (error) {
    console.error("Forgot password error:", error);
    throw error;
  }
};

export const confirmForgotPassword = async (
  username: string,
  confirmationCode: string,
  newPassword: string
) => {
  try {
    const command = new ConfirmForgotPasswordCommand({
      ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
      Username: username,
      ConfirmationCode: confirmationCode,
      Password: newPassword,
    });

    const response = await client.send(command);
    return response;
  } catch (error) {
    console.error("Confirm forgot password error:", error);
    throw error;
  }
};
*/
