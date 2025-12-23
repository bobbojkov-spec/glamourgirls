'use client';

import { useState } from 'react';

interface CaptchaProps {
  onVerify: () => void;
}

/**
 * Placeholder CAPTCHA component
 * In production, replace with actual Google reCAPTCHA or hCaptcha integration
 * 
 * For reCAPTCHA: npm install react-google-recaptcha
 * For hCaptcha: npm install @hcaptcha/react-hcaptcha
 */
export default function Captcha({ onVerify }: CaptchaProps) {
  const [verified, setVerified] = useState(false);

  const handleVerify = () => {
    setVerified(true);
    onVerify();
  };

  return (
    <div className="border border-gray-300 p-4 bg-gray-50 rounded">
      <p className="text-sm text-gray-600 mb-3">
        Please verify you&apos;re human:
      </p>
      
      {/* Placeholder checkbox - replace with actual CAPTCHA widget */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={verified}
            onChange={(e) => {
              if (e.target.checked) {
                handleVerify();
              } else {
                setVerified(false);
              }
            }}
            className="w-5 h-5 accent-[#4a5a3a]"
          />
          <span className="text-sm">I&apos;m not a robot</span>
        </label>
        {verified && (
          <span className="text-green-600 text-sm flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Verified
          </span>
        )}
      </div>
      
      <p className="text-xs text-gray-400 mt-3">
        {/* Integration note for developers */}
        To integrate real CAPTCHA, install react-google-recaptcha or @hcaptcha/react-hcaptcha
      </p>
    </div>
  );
}




