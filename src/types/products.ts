export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  stripePriceId: string;
  features: string[];
}

export const PRODUCTS: Product[] = [
  {
    id: "prod_TGyn4MgtPcaDTr",
    name: "Back Rent Reporting",
    description:
      "Report your historical rent payments to improve your credit score",
    price: 49.99,
    originalPrice: 99.99,
    stripePriceId:
      import.meta.env.VITE_STRIPE_BACK_RENT_REPORTING_PRICE_ID ||
      "price_1SMIM9IaKHhzCYTq2zZfITwz",
    features: [
      "Report up to 12 months of back rent payments",
      "Build your credit history",
      "Impact your credit score",
    ],
  },
  {
    id: "prod_TGyn4MgtPcaDTr",
    name: "Back Rent Reporting",
    description:
      "Report your historical rent payments to improve your credit score",
    price: 99.99,
    stripePriceId: "price_1SKQpVIaKHhzCYTqv7LU5CoF",
    features: [
      "Report up to 12 months of back rent payments",
      "Build your credit history",
      "Impact your credit score",
    ],
  },
  {
    id: "prod_IDV",
    name: "ID Verification",
    description:
      "Verify your identity to unlock Silver and Gold membership plans.",
    price: 19.99,
    stripePriceId:
      import.meta.env.VITE_STRIPE_ID_VERIFICATION_PRICE_ID ||
      "price_dummy_id_verification",
    features: [
      "One-time identity verification",
      "Required for Silver and Gold",
      "Fast verification turnaround",
    ],
  },
];

export function getProductById(productId: string): Product | undefined {
  return PRODUCTS.find((product) => product.id === productId);
}
