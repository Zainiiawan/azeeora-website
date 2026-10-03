'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, Mail, RefreshCw, CheckCircle, XCircle, Server, Truck, Save } from 'lucide-react';
import Button from '@/components/ui/Button';
import { mediaApi, SmtpStatus } from '@/lib/api/mediaApi';
import { settingsApi } from '@/lib/api/settingsApi';

export default function AdminSettingsPage() {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<SmtpStatus | null>(null);
  const queryClient = useQueryClient();

  const [shippingCost, setShippingCost] = useState(200);
  const [freeThreshold, setFreeThreshold] = useState(5000);
  const [vipThreshold, setVipThreshold] = useState(5000);

  const { data: storeSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['store-settings'],
    queryFn: async () => {
      const data = await settingsApi.getSettings();
      setShippingCost(data.defaultShippingCost);
      setFreeThreshold(data.freeShippingThreshold);
      if (data.vipThreshold !== undefined) setVipThreshold(data.vipThreshold);
      return data;
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: settingsApi.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-settings'] });
      alert('Settings updated successfully');
    },
    onError: () => {
      alert('Failed to update settings');
    },
  });

  const { data: smtpStatus, isLoading, refetch } = useQuery({
    queryKey: ['smtp-status'],
    queryFn: mediaApi.getSmtpStatus,
  });

  const handleTestSmtp = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await mediaApi.getSmtpStatus();
      setTestResult(result);
      await refetch();
    } catch {
      setTestResult({ ok: false, message: 'SMTP test failed. Check server configuration.' });
    } finally {
      setTesting(false);
    }
  };

  const status = testResult ?? smtpStatus;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-500 hover:text-black">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-serif font-bold text-black">Settings</h1>
            <p className="text-gray-600">Store configuration and email delivery</p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-3xl space-y-6">
        {/* SMTP Status */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-gold/10 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-rose-gold" />
              </div>
              <div>
                <h2 className="font-semibold text-black">Email (SMTP)</h2>
                <p className="text-sm text-gray-500">OTP, order confirmations, and notifications</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => void handleTestSmtp()} disabled={testing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${testing ? 'animate-spin' : ''}`} />
              {testing ? 'Testing…' : 'Test Connection'}
            </Button>
          </div>

          {isLoading && !status ? (
            <p className="text-gray-500">Loading SMTP status…</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50">
                {status?.ok ? (
                  <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                )}
                <div>
                  <p className={`font-medium ${status?.ok ? 'text-green-700' : 'text-red-700'}`}>
                    {status?.ok ? 'SMTP Connected' : 'SMTP Not Connected'}
                  </p>
                  <p className="text-sm text-gray-600">{status?.message}</p>
                </div>
              </div>

              {status?.host && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">Host</p>
                    <p className="font-medium text-black">{status.host}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">Port</p>
                    <p className="font-medium text-black">{status.port}</p>
                  </div>
                  {status.user && (
                    <div className="p-3 bg-gray-50 rounded-lg col-span-2">
                      <p className="text-gray-500">Sender Email</p>
                      <p className="font-medium text-black">{status.user}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Shipping Settings */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-gold/10 rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-rose-gold" />
              </div>
              <div>
                <h2 className="font-semibold text-black">Shipping Settings</h2>
                <p className="text-sm text-gray-500">Global defaults and thresholds</p>
              </div>
            </div>
            <Button
              onClick={() => updateSettingsMutation.mutate({ defaultShippingCost: shippingCost, freeShippingThreshold: freeThreshold, vipThreshold: vipThreshold })}
              disabled={updateSettingsMutation.isPending || settingsLoading}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Default Shipping Cost (Rs.)</label>
              <input
                type="number"
                value={shippingCost}
                onChange={(e) => setShippingCost(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-black focus:border-black"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">Applied if the customer's city is not in the custom rates table.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Free Shipping Threshold (Rs.)</label>
              <input
                type="number"
                value={freeThreshold}
                onChange={(e) => setFreeThreshold(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-black focus:border-black"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">Orders above this amount get free shipping automatically.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">VIP Customer Threshold (Rs.)</label>
              <input
                type="number"
                value={vipThreshold}
                onChange={(e) => setVipThreshold(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-black focus:border-black"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">Customers with total spent above this amount will get a VIP badge.</p>
            </div>
          </div>
        </div>

        {/* Store Info */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-rose-gold/10 rounded-lg flex items-center justify-center">
              <Server className="w-5 h-5 text-rose-gold" />
            </div>
            <div>
              <h2 className="font-semibold text-black">Store</h2>
              <p className="text-sm text-gray-500">AZEEORA COSMETICS platform</p>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Payment Methods</span>
              <span className="font-medium">COD, JazzCash, Easypaisa</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Currency</span>
              <span className="font-medium">PKR (Rs.)</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Catalog Management</span>
              <Link href="/admin/catalog" className="font-medium text-rose-gold hover:underline">
                Manage Categories & Brands →
              </Link>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Shipping Rates</span>
              <Link href="/admin/shipping" className="font-medium text-rose-gold hover:underline">
                Manage Custom City Rates →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
