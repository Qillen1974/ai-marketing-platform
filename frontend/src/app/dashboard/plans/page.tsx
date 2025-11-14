'use client';

import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface Plan {
  name: string;
  price: number;
  billingPeriod: string;
  description: string;
  features: string[];
  limits: {
    audits: number | string;
    backlinks: number | string;
    emails: number | string;
    websites: number | string;
  };
  recommended?: boolean;
  cta: string;
}

export default function PlansPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(false);
  }, [token]);

  const plans: Plan[] = [
    {
      name: 'FREE',
      price: 0,
      billingPeriod: '/month',
      description: 'Perfect for testing and small projects',
      features: [
        '✓ 5 SEO Audits/month',
        '✓ 10 Backlink Discoveries/month',
        '✓ 5 Emails Sent/month',
        '✓ 1 Website',
        '✓ Basic Dashboard',
        '✓ Community Support',
      ],
      limits: {
        audits: '5',
        backlinks: '10',
        emails: '5',
        websites: '1',
      },
      cta: user?.plan === 'free' ? 'Your Plan' : 'Downgrade to Free',
    },
    {
      name: 'STARTER',
      price: 29,
      billingPeriod: '/month',
      description: 'For freelancers and small teams',
      features: [
        '✓ 50 SEO Audits/month',
        '✓ 100 Backlink Discoveries/month',
        '✓ 100 Emails Sent/month',
        '✓ 10 Websites',
        '✓ Keyword Tracking',
        '✓ Email Support',
      ],
      limits: {
        audits: '50',
        backlinks: '100',
        emails: '100',
        websites: '10',
      },
      recommended: true,
      cta: user?.plan === 'starter' ? 'Your Plan' : 'Upgrade Now',
    },
    {
      name: 'PROFESSIONAL',
      price: 79,
      billingPeriod: '/month',
      description: 'For agencies and growing businesses',
      features: [
        '✓ 500 SEO Audits/month',
        '✓ 500 Backlink Discoveries/month',
        '✓ 500 Emails Sent/month',
        '✓ Unlimited Websites',
        '✓ Advanced Analytics',
        '✓ Priority Support',
        '✓ Team Collaboration (2 users)',
      ],
      limits: {
        audits: '500',
        backlinks: '500',
        emails: '500',
        websites: '∞',
      },
      cta: user?.plan === 'professional' ? 'Your Plan' : 'Upgrade Now',
    },
    {
      name: 'ENTERPRISE',
      price: 0,
      billingPeriod: 'Custom',
      description: 'For large teams with custom needs',
      features: [
        '✓ Unlimited Everything',
        '✓ Unlimited Websites',
        '✓ Unlimited Team Members',
        '✓ API Access',
        '✓ White-Label Option',
        '✓ 24/7 Dedicated Support',
        '✓ Custom Integrations',
      ],
      limits: {
        audits: '∞',
        backlinks: '∞',
        emails: '∞',
        websites: '∞',
      },
      cta: 'Contact Sales',
    },
  ];

  if (!token) return null;

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading plans...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h1>
        <p className="text-xl text-gray-600">
          Choose the perfect plan for your SEO marketing needs. All plans can be upgraded with your own API keys.
        </p>
      </div>

      {/* Toggle Annual/Monthly */}
      <div className="text-center mb-12">
        <div className="inline-flex rounded-lg border border-gray-200">
          <button className="px-6 py-2 font-semibold text-white bg-blue-600 rounded-l-lg">
            Monthly
          </button>
          <button className="px-6 py-2 font-semibold text-gray-600 bg-white rounded-r-lg hover:bg-gray-50">
            Annual (-20%)
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">Save 20% when you pay annually</p>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-4 gap-6 mb-12">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative rounded-lg overflow-hidden transition-all ${
              plan.recommended
                ? 'border-2 border-blue-500 shadow-xl scale-105'
                : 'border border-gray-200 shadow'
            } ${plan.name === user?.plan.toUpperCase() ? 'bg-blue-50' : 'bg-white'}`}
          >
            {/* Recommended Badge */}
            {plan.recommended && (
              <div className="bg-blue-500 text-white text-xs font-bold px-4 py-2 text-center">
                MOST POPULAR
              </div>
            )}

            {/* Plan Content */}
            <div className="p-6">
              {/* Plan Name & Price */}
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
              <p className="text-gray-600 text-sm mb-4">{plan.description}</p>

              <div className="mb-6">
                {plan.price > 0 ? (
                  <>
                    <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                    <span className="text-gray-600 text-sm">{plan.billingPeriod}</span>
                  </>
                ) : (
                  <>
                    <span className="text-4xl font-bold text-gray-900">Free</span>
                    {plan.billingPeriod !== 'Custom' && (
                      <span className="text-gray-600 text-sm block">{plan.billingPeriod}</span>
                    )}
                  </>
                )}
              </div>

              {/* CTA Button */}
              <button
                disabled={plan.name === user?.plan.toUpperCase()}
                className={`w-full py-3 rounded-lg font-semibold mb-6 transition ${
                  plan.name === user?.plan.toUpperCase()
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : plan.recommended
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'border border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                {plan.cta}
              </button>

              {/* Limits */}
              <div className="border-t border-gray-200 pt-6 mb-6">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Monthly Limits</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">SEO Audits</span>
                    <span className="font-semibold text-gray-900">{plan.limits.audits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Backlink Discovery</span>
                    <span className="font-semibold text-gray-900">{plan.limits.backlinks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Emails Sent</span>
                    <span className="font-semibold text-gray-900">{plan.limits.emails}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Websites</span>
                    <span className="font-semibold text-gray-900">{plan.limits.websites}</span>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2">
                {plan.features.map((feature, idx) => (
                  <p key={idx} className="text-sm text-gray-700">
                    {feature}
                  </p>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FAQ Section */}
      <div className="bg-white rounded-lg shadow p-8 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Can I change my plan anytime?</h3>
            <p className="text-gray-600">
              Yes! You can upgrade or downgrade your plan anytime. Changes take effect at the next billing cycle.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">What happens if I exceed my quota?</h3>
            <p className="text-gray-600">
              You'll be unable to use that feature until your quota resets. You can upgrade your plan or provide your own API keys to continue using the feature.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Can I use my own API keys?</h3>
            <p className="text-gray-600">
              Yes! You can add your own API keys in Settings to bypass our quota limits. This is perfect if you have your own Google, Serper, or Resend accounts.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Do you offer discounts for annual billing?</h3>
            <p className="text-gray-600">
              Yes! Annual plans come with a 20% discount compared to monthly billing.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">What's included in custom Enterprise pricing?</h3>
            <p className="text-gray-600">
              Enterprise plans include unlimited everything plus dedicated support, API access, white-label options, and custom integrations. Contact our sales team for details.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to get started?</h2>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => router.push('/dashboard/quota')}
            className="px-8 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
          >
            View Your Usage
          </button>
          <button
            onClick={() => router.push('/dashboard/settings')}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            Add API Keys
          </button>
        </div>
      </div>
    </div>
  );
}
