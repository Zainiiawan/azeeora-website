'use client';

import { useState } from 'react';
import { Phone, Mail, MapPin, Clock, MessageCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { contactApi } from '@/lib/api/contactApi';

const CONTACT = {
  phone: '+92 306 0466911',
  whatsapp: '923060466911',
  email: 'azeeoracosmetics@gmail.com',
  city: 'Sahiwal',
  country: 'Pakistan',
  address: 'Sahiwal, Punjab, Pakistan',
  hours: 'Mon – Sat: 10:00 AM – 8:00 PM (PKT)',
};

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await contactApi.submit(form);
      setStatus('success');
      setStatusMsg(res.message);
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err: unknown) {
      setStatus('error');
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to send message. Please call us directly.';
      setStatusMsg(msg);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <section className="bg-black text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-serif font-bold mb-4">Contact Us</h1>
          <p className="text-gray-300 max-w-xl mx-auto">
            We&apos;d love to hear from you. Reach out for orders, product advice, or partnership enquiries.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 grid lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-serif font-bold mb-6">Get in Touch</h2>
            <ul className="space-y-5">
              <li className="flex items-start gap-4">
                <Phone className="w-5 h-5 text-rose-gold mt-0.5" />
                <div>
                  <p className="font-medium">Phone</p>
                  <a href={`tel:${CONTACT.phone.replace(/\s/g, '')}`} className="text-gray-600 hover:text-rose-gold">{CONTACT.phone}</a>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <MessageCircle className="w-5 h-5 text-rose-gold mt-0.5" />
                <div>
                  <p className="font-medium">WhatsApp</p>
                  <a href={`https://wa.me/${CONTACT.whatsapp}`} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-rose-gold">
                    Chat on WhatsApp
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <Mail className="w-5 h-5 text-rose-gold mt-0.5" />
                <div>
                  <p className="font-medium">Email</p>
                  <a href={`mailto:${CONTACT.email}`} className="text-gray-600 hover:text-rose-gold">{CONTACT.email}</a>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <MapPin className="w-5 h-5 text-rose-gold mt-0.5" />
                <div>
                  <p className="font-medium">Location</p>
                  <p className="text-gray-600">{CONTACT.address}</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <Clock className="w-5 h-5 text-rose-gold mt-0.5" />
                <div>
                  <p className="font-medium">Business Hours</p>
                  <p className="text-gray-600">{CONTACT.hours}</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-xl overflow-hidden shadow-sm h-64 flex items-center justify-center border border-gray-200">
            <div className="text-center text-gray-500 p-6">
              <MapPin className="w-10 h-10 text-rose-gold mx-auto mb-3" />
              <p className="font-medium text-gray-700">AZEEORA COSMETICS</p>
              <p className="text-sm">{CONTACT.city}, {CONTACT.country}</p>
              <p className="text-xs mt-2 text-gray-400">Google Maps embed ready for production</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-xl font-serif font-bold mb-2">Send a Message</h2>
          <Input label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={5}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 focus:border-rose-gold focus:ring-2 focus:ring-rose-gold/30 focus:outline-none"
            />
          </div>
          {statusMsg && (
            <p className={`text-sm ${status === 'success' ? 'text-green-600' : 'text-red-600'}`}>{statusMsg}</p>
          )}
          <Button type="submit" className="w-full" loading={status === 'loading'}>Send Message</Button>
        </form>
      </div>
    </div>
  );
}
