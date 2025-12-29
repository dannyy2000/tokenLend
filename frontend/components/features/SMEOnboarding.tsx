'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Spinner } from '@/components/ui/Spinner';
import { createBusinessProfile } from '@/lib/api/verification';

interface SMEOnboardingProps {
  walletAddress: string;
  onComplete?: () => void;
}

export function SMEOnboarding({ walletAddress, onComplete }: SMEOnboardingProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    businessName: '',
    cacNumber: '',
    businessType: '',
    businessPhone: '',
    businessEmail: '',
    street: '',
    city: '',
    state: '',
    numberOfEmployees: '',
    verificationConsent: false
  });

  const businessTypes = [
    { value: 'retail', label: 'Retail' },
    { value: 'wholesale', label: 'Wholesale' },
    { value: 'manufacturing', label: 'Manufacturing' },
    { value: 'services', label: 'Services' },
    { value: 'agriculture', label: 'Agriculture' },
    { value: 'technology', label: 'Technology' },
    { value: 'hospitality', label: 'Hospitality' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'education', label: 'Education' },
    { value: 'other', label: 'Other' }
  ];

  const employeeCounts = [
    { value: '1-5', label: '1-5 employees' },
    { value: '6-10', label: '6-10 employees' },
    { value: '11-50', label: '11-50 employees' },
    { value: '51-200', label: '51-200 employees' },
    { value: '200+', label: '200+ employees' }
  ];

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateStep1 = () => {
    if (!formData.businessName) {
      setError('Business name is required');
      return false;
    }
    if (!formData.businessType) {
      setError('Business type is required');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.city || !formData.state) {
      setError('City and state are required');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    if (!formData.verificationConsent) {
      setError('You must confirm that this is a registered business');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const profile = {
        businessName: formData.businessName,
        cacNumber: formData.cacNumber || undefined,
        businessType: formData.businessType,
        businessAddress: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          country: 'Nigeria'
        },
        businessPhone: formData.businessPhone || undefined,
        businessEmail: formData.businessEmail || undefined,
        numberOfEmployees: formData.numberOfEmployees || undefined,
        verificationConsent: formData.verificationConsent
      };

      const result = await createBusinessProfile(walletAddress, profile);

      if (result.success) {
        // Success! User is now verified
        if (onComplete) {
          onComplete();
        } else {
          router.push('/borrow');
        }
      } else {
        setError(result.error || 'Failed to create business profile');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-white/70">
            Step {step} of 3
          </span>
          <span className="text-sm font-medium text-white/70">
            SME Verification
          </span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* Step 1: Business Information */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Business Information
            </h2>
            <p className="text-white/60">
              Tell us about your business to get started
            </p>
          </div>

          <Input
            label="Business Name *"
            value={formData.businessName}
            onChange={(e) => handleChange('businessName', e.target.value)}
            placeholder="e.g., Adewale Trading Company"
          />

          <Input
            label="CAC Registration Number (Optional)"
            value={formData.cacNumber}
            onChange={(e) => handleChange('cacNumber', e.target.value)}
            placeholder="e.g., RC123456"
            helperText="Corporate Affairs Commission number"
          />

          <Select
            label="Business Type *"
            value={formData.businessType}
            onChange={(e) => handleChange('businessType', e.target.value)}
            options={[
              { value: '', label: 'Select business type' },
              ...businessTypes
            ]}
          />

          <Select
            label="Number of Employees (Optional)"
            value={formData.numberOfEmployees}
            onChange={(e) => handleChange('numberOfEmployees', e.target.value)}
            options={[
              { value: '', label: 'Select employee count' },
              ...employeeCounts
            ]}
          />

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <Button onClick={handleNext} className="w-full">
            Continue
          </Button>
        </div>
      )}

      {/* Step 2: Contact & Address */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Contact & Location
            </h2>
            <p className="text-white/60">
              Where is your business located?
            </p>
          </div>

          <Input
            label="Business Phone (Optional)"
            type="tel"
            value={formData.businessPhone}
            onChange={(e) => handleChange('businessPhone', e.target.value)}
            placeholder="+234 XXX XXX XXXX"
          />

          <Input
            label="Business Email (Optional)"
            type="email"
            value={formData.businessEmail}
            onChange={(e) => handleChange('businessEmail', e.target.value)}
            placeholder="contact@business.com"
          />

          <Input
            label="Street Address (Optional)"
            value={formData.street}
            onChange={(e) => handleChange('street', e.target.value)}
            placeholder="e.g., 123 Market Road"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="City *"
              value={formData.city}
              onChange={(e) => handleChange('city', e.target.value)}
              placeholder="e.g., Lagos"
            />

            <Input
              label="State *"
              value={formData.state}
              onChange={(e) => handleChange('state', e.target.value)}
              placeholder="e.g., Lagos"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => setStep(1)}
              className="flex-1"
            >
              Back
            </Button>
            <Button onClick={handleNext} className="flex-1">
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Verification Consent */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Verification
            </h2>
            <p className="text-white/60">
              Confirm your business details
            </p>
          </div>

          {/* Summary */}
          <div className="p-6 bg-white/5 border border-white/10 rounded-lg space-y-3">
            <h3 className="font-semibold text-white mb-4">Business Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-white/50">Business Name:</span>
                <p className="text-white font-medium">{formData.businessName}</p>
              </div>
              <div>
                <span className="text-white/50">Type:</span>
                <p className="text-white font-medium capitalize">{formData.businessType}</p>
              </div>
              {formData.cacNumber && (
                <div>
                  <span className="text-white/50">CAC Number:</span>
                  <p className="text-white font-medium">{formData.cacNumber}</p>
                </div>
              )}
              <div>
                <span className="text-white/50">Location:</span>
                <p className="text-white font-medium">{formData.city}, {formData.state}</p>
              </div>
            </div>
          </div>

          {/* Consent Checkbox */}
          <div className="p-6 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-lg">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.verificationConsent}
                onChange={(e) => handleChange('verificationConsent', e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-white/20 bg-white/10 text-indigo-500 focus:ring-2 focus:ring-indigo-500"
              />
              <div>
                <p className="text-white font-medium mb-1">
                  I confirm this is a registered business
                </p>
                <p className="text-white/60 text-sm">
                  By checking this box, you confirm that the information provided is accurate
                  and that you are authorized to represent this business. Your profile will
                  be automatically verified for the hackathon.
                </p>
              </div>
            </label>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => setStep(2)}
              className="flex-1"
              disabled={loading}
            >
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={loading || !formData.verificationConsent}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" />
                  Verifying...
                </span>
              ) : (
                'Complete Verification'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
