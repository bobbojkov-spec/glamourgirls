'use client';

import { useState } from 'react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // TODO: Implement API endpoint for contact form
      // For now, just simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSubmitStatus('success');
      setFormData({ name: '', email: '', message: '' });
      
      // Auto close after 2 seconds
      setTimeout(() => {
        onClose();
        setSubmitStatus('idle');
      }, 2000);
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[998] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
        <div className="bg-[#E6D9B3] rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 bg-[#D9CCA3]">
            <h2 className="text-vintage-brown" style={{ fontFamily: 'var(--font-protest-strike)', fontSize: '14px' }}>
              Contact Us
            </h2>
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-900 transition-colors p-1"
              aria-label="Close contact form"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {submitStatus === 'success' ? (
              <div className="text-center py-8">
                <div className="mb-4">
                  <svg className="w-16 h-16 text-green-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="vintage-condensed text-lg text-vintage-brown tracking-wider">
                  Message Sent!
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  We'll get back to you soon.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1890ff] bg-white"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1890ff] bg-white"
                    placeholder="your.email@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1890ff] bg-white resize-none"
                    placeholder="Your message..."
                  />
                </div>

                {submitStatus === 'error' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      Something went wrong. Please try again.
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#1890ff] rounded-lg hover:bg-[#b8941f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </>
  );
}

