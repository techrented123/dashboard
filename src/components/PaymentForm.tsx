import { useState } from 'react';
import { CreditCard, Lock } from 'lucide-react';

interface PaymentFormProps {
  onSubmit: (paymentData: PaymentData) => void;
  loading: boolean;
}

export interface PaymentData {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardholderName: string;
  billingAddress: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
}

export default function PaymentForm({ onSubmit, loading }: PaymentFormProps) {
  const [paymentData, setPaymentData] = useState<PaymentData>({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    billingAddress: {
      street: '',
      city: '',
      province: '',
      postalCode: '',
      country: 'Canada'
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('billing.')) {
      const field = name.split('.')[1];
      setPaymentData(prev => ({
        ...prev,
        billingAddress: {
          ...prev.billingAddress,
          [field]: value
        }
      }));
    } else {
      setPaymentData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\D/g, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setPaymentData(prev => ({ ...prev, cardNumber: formatted }));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiryDate(e.target.value);
    setPaymentData(prev => ({ ...prev, expiryDate: formatted }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(paymentData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Method */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Payment Method
        </h3>
        
        <div>
          <label className="text-sm block mb-1 dark:text-slate-300">
            Cardholder Name
          </label>
          <input
            type="text"
            name="cardholderName"
            value={paymentData.cardholderName}
            onChange={handleInputChange}
            className="w-full rounded-xl border dark:border-slate-600 px-3 py-2 outline-none focus:ring-2 focus:ring-secondary-300 transition-all bg-white dark:bg-slate-700 dark:text-white"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label className="text-sm block mb-1 dark:text-slate-300">
            Card Number
          </label>
          <input
            type="text"
            value={paymentData.cardNumber}
            onChange={handleCardNumberChange}
            className="w-full rounded-xl border dark:border-slate-600 px-3 py-2 outline-none focus:ring-2 focus:ring-secondary-300 transition-all bg-white dark:bg-slate-700 dark:text-white"
            placeholder="1234 5678 9012 3456"
            maxLength={19}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm block mb-1 dark:text-slate-300">
              Expiry Date
            </label>
            <input
              type="text"
              value={paymentData.expiryDate}
              onChange={handleExpiryChange}
              className="w-full rounded-xl border dark:border-slate-600 px-3 py-2 outline-none focus:ring-2 focus:ring-secondary-300 transition-all bg-white dark:bg-slate-700 dark:text-white"
              placeholder="MM/YY"
              maxLength={5}
            />
          </div>
          <div>
            <label className="text-sm block mb-1 dark:text-slate-300">
              CVV
            </label>
            <input
              type="text"
              name="cvv"
              value={paymentData.cvv}
              onChange={handleInputChange}
              className="w-full rounded-xl border dark:border-slate-600 px-3 py-2 outline-none focus:ring-2 focus:ring-secondary-300 transition-all bg-white dark:bg-slate-700 dark:text-white"
              placeholder="123"
              maxLength={4}
            />
          </div>
        </div>
      </div>

      {/* Billing Address */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          Billing Address
        </h3>
        
        <div>
          <label className="text-sm block mb-1 dark:text-slate-300">
            Street Address
          </label>
          <input
            type="text"
            name="billing.street"
            value={paymentData.billingAddress.street}
            onChange={handleInputChange}
            className="w-full rounded-xl border dark:border-slate-600 px-3 py-2 outline-none focus:ring-2 focus:ring-secondary-300 transition-all bg-white dark:bg-slate-700 dark:text-white"
            placeholder="123 Main Street"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm block mb-1 dark:text-slate-300">
              City
            </label>
            <input
              type="text"
              name="billing.city"
              value={paymentData.billingAddress.city}
              onChange={handleInputChange}
              className="w-full rounded-xl border dark:border-slate-600 px-3 py-2 outline-none focus:ring-2 focus:ring-secondary-300 transition-all bg-white dark:bg-slate-700 dark:text-white"
              placeholder="Vancouver"
            />
          </div>
          <div>
            <label className="text-sm block mb-1 dark:text-slate-300">
              Province
            </label>
            <select
              name="billing.province"
              value={paymentData.billingAddress.province}
              onChange={handleInputChange}
              className="w-full rounded-xl border dark:border-slate-600 px-3 py-2 outline-none focus:ring-2 focus:ring-secondary-300 transition-all bg-white dark:bg-slate-700 dark:text-white"
            >
              <option value="">Select Province</option>
              <option value="AB">Alberta</option>
              <option value="BC">British Columbia</option>
              <option value="MB">Manitoba</option>
              <option value="NB">New Brunswick</option>
              <option value="NL">Newfoundland and Labrador</option>
              <option value="NS">Nova Scotia</option>
              <option value="ON">Ontario</option>
              <option value="PE">Prince Edward Island</option>
              <option value="QC">Quebec</option>
              <option value="SK">Saskatchewan</option>
              <option value="NT">Northwest Territories</option>
              <option value="NU">Nunavut</option>
              <option value="YT">Yukon</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm block mb-1 dark:text-slate-300">
              Postal Code
            </label>
            <input
              type="text"
              name="billing.postalCode"
              value={paymentData.billingAddress.postalCode}
              onChange={handleInputChange}
              className="w-full rounded-xl border dark:border-slate-600 px-3 py-2 outline-none focus:ring-2 focus:ring-secondary-300 transition-all bg-white dark:bg-slate-700 dark:text-white"
              placeholder="V6B 1A1"
            />
          </div>
          <div>
            <label className="text-sm block mb-1 dark:text-slate-300">
              Country
            </label>
            <select
              name="billing.country"
              value={paymentData.billingAddress.country}
              onChange={handleInputChange}
              className="w-full rounded-xl border dark:border-slate-600 px-3 py-2 outline-none focus:ring-2 focus:ring-secondary-300 transition-all bg-white dark:bg-slate-700 dark:text-white"
            >
              <option value="Canada">Canada</option>
              <option value="United States">United States</option>
            </select>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-700 rounded-xl">
        <Lock className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        <span className="text-xs text-slate-600 dark:text-slate-400">
          Your payment information is encrypted and secure
        </span>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-secondary text-white rounded-xl py-3 font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Complete Registration & Start Free Trial'}
      </button>
    </form>
  );
}