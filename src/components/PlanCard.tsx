import { Check } from 'lucide-react';
import { Plan } from '../types/plans';

interface PlanCardProps {
  plan: Plan;
  selected: boolean;
  onSelect: (planId: string) => void;
}

export default function PlanCard({ plan, selected, onSelect }: PlanCardProps) {
  return (
    <div
      className={`relative rounded-2xl border-2 p-6 cursor-pointer transition-all ${
        selected
          ? 'border-secondary bg-secondary/5 dark:bg-secondary/10'
          : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
      }`}
      onClick={() => onSelect(plan.id)}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-secondary text-white text-xs font-medium px-3 py-1 rounded-full">
            Most Popular
          </span>
        </div>
      )}
      
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
          {plan.name}
        </h3>
        <div className="text-3xl font-bold text-slate-900 dark:text-white">
          ${plan.price}
          <span className="text-sm font-normal text-slate-600 dark:text-slate-400">/month</span>
        </div>
        <p className="text-sm text-green-600 font-medium mt-1">
          2 months free trial
        </p>
      </div>

      {selected && (
        <div className="absolute top-4 right-4">
          <div className="w-6 h-6 bg-secondary rounded-full flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}