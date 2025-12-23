'use client';

import { useState } from 'react';
import Captcha from './Captcha';

interface ContactFormProps {
  onSuccess?: () => void;
}

export default function ContactForm({ onSuccess }: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messageMaxLength = 500;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!captchaVerified) {
      setError('Please complete the CAPTCHA verification');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Mock API call - in production this would send to backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Form submitted:', formData);
      onSuccess?.();
    } catch {
      setError('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Your Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="w-full border border-gray-300 px-3 py-2 focus:outline-none focus:border-[#1890ff]"
          required
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">
          Your Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          id="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          className="w-full border border-gray-300 px-3 py-2 focus:outline-none focus:border-[#1890ff]"
          required
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium mb-1">
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          id="message"
          value={formData.message}
          onChange={(e) => {
            if (e.target.value.length <= messageMaxLength) {
              setFormData(prev => ({ ...prev, message: e.target.value }));
            }
          }}
          rows={6}
          className="w-full border border-gray-300 px-3 py-2 focus:outline-none focus:border-[#1890ff] resize-vertical"
          required
        />
        <p className="text-xs text-gray-500 mt-1 text-right">
          {formData.message.length}/{messageMaxLength} characters
        </p>
      </div>

      {/* CAPTCHA */}
      <Captcha onVerify={() => setCaptchaVerified(true)} />

      <div className="text-center pt-4">
        <button 
          type="submit" 
          className="btn-vintage px-8 py-3"
          disabled={isSubmitting || !captchaVerified}
        >
          {isSubmitting ? 'Sending...' : 'Send Message'}
        </button>
      </div>
    </form>
  );
}




