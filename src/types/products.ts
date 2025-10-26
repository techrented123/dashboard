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
      "price_1SKQpVIaKHhzCYTqv7LU5CoF",
    features: [
      "Report up to 12 months of back rent payments",
      "Build your credit history",
      "Impact your credit score",
    ],
  },
];

export function getProductById(productId: string): Product | undefined {
  return PRODUCTS.find((product) => product.id === productId);
}
