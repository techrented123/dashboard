export interface Plan {
  id: 'bronze' | 'silver' | 'gold';
  name: string;
  price: number;
  stripeId: string;
  features: string[];
  popular?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: 'bronze',
    name: 'Bronze',
    price: 4.99,
    stripeId: import.meta.env.VITE_STRIPE_BRONZE_PRICE_ID || 'price_1R2echIaKHhzCYTqiJsQkTHM',
    features: [
      'Basic rent reporting',
      'Monthly credit updates',
      'Document storage (50MB)',
      'Email support'
    ]
  },
  {
    id: 'silver',
    name: 'Silver',
    price: 9.99,
    stripeId: import.meta.env.VITE_STRIPE_SILVER_PRICE_ID || 'plan_S3f5PwOKHCWk5G',
    popular: true,
    features: [
      'Rent reporting to all 3 bureaus',
      'Weekly credit score updates',
      'Document storage (100MB)',
      'Priority email support',
      'Credit improvement tips'
    ]
  },
  {
    id: 'gold',
    name: 'Gold',
    price: 24.99,
    stripeId: import.meta.env.VITE_STRIPE_GOLD_PRICE_ID || 'plan_S3h1gHoLzS1QFt',
    features: [
      'Everything in Silver',
      'Real-time credit monitoring',
      'Unlimited document storage',
      'Phone support',
      'Personal credit advisor',
      'Rental application assistance'
    ]
  }
];

export function getPlanFromUrl(): Plan {
  const urlParams = new URLSearchParams(window.location.search);
  const planParam = urlParams.get('plan') as 'bronze' | 'silver' | 'gold';
  
  const selectedPlan = PLANS.find(plan => plan.id === planParam);
  return selectedPlan || PLANS.find(plan => plan.id === 'silver')!;
}