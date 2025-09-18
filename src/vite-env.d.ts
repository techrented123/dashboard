/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string;
  readonly VITE_STRIPE_GOLD_PRICE_ID: string;
  readonly VITE_STRIPE_SILVER_PRICE_ID: string;
  readonly VITE_STRIPE_BRONZE_PRICE_ID: string;
  readonly VITE_AWS_REGION: string;
  readonly VITE_COGNITO_CLIENT_ID: string;
  readonly VITE_COGNITO_USER_POOL_ID: string;
  readonly VITE_COGNITO_IDENTITY_POOL_ID: string;
  readonly VITE_API_GATEWAY_URL: string;
  readonly VITE_S3_BUCKET_NAME: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
