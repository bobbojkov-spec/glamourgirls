'use client';

import { useState, useEffect } from 'react';
import { generateSEO, validateSEO, type SEOData, type SEOValidation } from '@/lib/seo/generate-seo';

interface SEOFormSectionProps {
  actressData: {
    name: string;
    firstName?: string;
    lastName?: string;
    birthName?: string;
    era?: string;
    slug: string;
    id: number;
  };
  initialSEO?: Partial<SEOData>;
  onChange: (seo: SEOData) => void;
  imageCount?: number;
}

export default function SEOFormSection({ 
  actressData, 
  initialSEO, 
  onChange,
  imageCount = 0 
}: SEOFormSectionProps) {
  const [seo, setSeo] = useState<SEOData>(() => {
    if (initialSEO) {
      return {
        seoTitle: initialSEO.seoTitle || '',
        metaDescription: initialSEO.metaDescription || '',
        metaKeywords: initialSEO.metaKeywords || '',
        ogTitle: initialSEO.ogTitle || '',
        ogDescription: initialSEO.ogDescription || '',
        ogImage: initialSEO.ogImage || '',
        canonicalUrl: initialSEO.canonicalUrl || '',
        h1Title: initialSEO.h1Title || '',
        introText: initialSEO.introText || '',
      };
    }
    // Auto-generate if no initial data
    const generated = generateSEO(actressData);
    return generated;
  });

  const [validation, setValidation] = useState<SEOValidation | null>(null);
  const [autoGenerate, setAutoGenerate] = useState(!initialSEO);

  useEffect(() => {
    if (autoGenerate && actressData.name) {
      const generated = generateSEO(actressData);
      setSeo(generated);
    }
  }, [actressData.name, actressData.firstName, actressData.lastName, actressData.era, actressData.slug, autoGenerate]);

  useEffect(() => {
    onChange(seo);
    const validationResult = validateSEO(seo, imageCount > 0);
    setValidation(validationResult);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seo, imageCount]);

  const handleChange = (field: keyof SEOData, value: string) => {
    setSeo(prev => ({ ...prev, [field]: value }));
    setAutoGenerate(false);
  };

  const handleAutoGenerate = () => {
    const generated = generateSEO(actressData);
    setSeo(generated);
    setAutoGenerate(true);
  };

  const getStatusColor = (status: 'green' | 'yellow' | 'red') => {
    switch (status) {
      case 'green': return 'bg-green-100 text-green-800 border-green-300';
      case 'yellow': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'red': return 'bg-red-100 text-red-800 border-red-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* SEO Status Indicator */}
      {validation && (
        <div className={`p-4 rounded-lg border-2 ${getStatusColor(validation.overall)}`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-protest font-semibold" style={{ fontSize: '14px' }}>SEO Status: {validation.overall.toUpperCase()}</h3>
            <button
              type="button"
              onClick={handleAutoGenerate}
              className="text-sm px-3 py-1 bg-white rounded hover:bg-gray-50"
            >
              Auto-Generate
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className={validation.titleLength.valid ? 'text-green-700' : 'text-red-700'}>
              Title: {validation.titleLength.length}/60
            </div>
            <div className={validation.metaDescLength.valid ? 'text-green-700' : 'text-red-700'}>
              Desc: {validation.metaDescLength.length}/160
            </div>
            <div className={validation.hasH1 ? 'text-green-700' : 'text-red-700'}>
              H1: {validation.hasH1 ? '✓' : '✗'}
            </div>
            <div className={validation.hasIntro ? 'text-green-700' : 'text-red-700'}>
              Intro: {validation.hasIntro ? '✓' : '✗'}
            </div>
            <div className={validation.hasAltText ? 'text-green-700' : 'text-red-700'}>
              ALT: {validation.hasAltText ? '✓' : '✗'}
            </div>
            <div className={validation.hasOgImage ? 'text-green-700' : 'text-red-700'}>
              OG Image: {validation.hasOgImage ? '✓' : '✗'}
            </div>
          </div>
        </div>
      )}

      {/* SEO Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          SEO Title {validation && (
            <span className={`ml-2 text-xs ${validation.titleLength.valid ? 'text-green-600' : 'text-red-600'}`}>
              ({validation.titleLength.length}/60)
            </span>
          )}
        </label>
        <input
          type="text"
          value={seo.seoTitle}
          onChange={(e) => handleChange('seoTitle', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          maxLength={60}
        />
        {validation && !validation.titleLength.valid && (
          <p className="text-xs text-red-600 mt-1">{validation.titleLength.message}</p>
        )}
      </div>

      {/* Meta Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Meta Description {validation && (
            <span className={`ml-2 text-xs ${validation.metaDescLength.valid ? 'text-green-600' : 'text-red-600'}`}>
              ({validation.metaDescLength.length}/160)
            </span>
          )}
        </label>
        <textarea
          value={seo.metaDescription}
          onChange={(e) => handleChange('metaDescription', e.target.value)}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          maxLength={160}
        />
        {validation && !validation.metaDescLength.valid && (
          <p className="text-xs text-red-600 mt-1">{validation.metaDescLength.message}</p>
        )}
      </div>

      {/* Meta Keywords */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Meta Keywords</label>
        <input
          type="text"
          value={seo.metaKeywords}
          onChange={(e) => handleChange('metaKeywords', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Comma-separated keywords"
        />
      </div>

      {/* H1 Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          H1 / Page Headline {validation && (
            <span className={`ml-2 text-xs ${validation.hasH1 ? 'text-green-600' : 'text-red-600'}`}>
              {validation.hasH1 ? '✓' : '✗ Missing'}
            </span>
          )}
        </label>
        <input
          type="text"
          value={seo.h1Title}
          onChange={(e) => handleChange('h1Title', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Intro Text */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Intro Text (100-220 words) {validation && (
            <span className={`ml-2 text-xs ${validation.hasIntro ? 'text-green-600' : 'text-red-600'}`}>
              {validation.hasIntro ? '✓' : '✗ Too short'}
            </span>
          )}
        </label>
        <textarea
          value={seo.introText}
          onChange={(e) => handleChange('introText', e.target.value)}
          rows={6}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Word count: {seo.introText.split(/\s+/).filter(Boolean).length}
        </p>
      </div>

      {/* OG Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">OG Title</label>
        <input
          type="text"
          value={seo.ogTitle}
          onChange={(e) => handleChange('ogTitle', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* OG Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">OG Description</label>
        <textarea
          value={seo.ogDescription}
          onChange={(e) => handleChange('ogDescription', e.target.value)}
          rows={2}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* OG Image */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          OG Image URL {validation && (
            <span className={`ml-2 text-xs ${validation.hasOgImage ? 'text-green-600' : 'text-red-600'}`}>
              {validation.hasOgImage ? '✓' : '✗ Missing'}
            </span>
          )}
        </label>
        <input
          type="text"
          value={seo.ogImage}
          onChange={(e) => handleChange('ogImage', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="https://example.com/image.jpg"
        />
      </div>

      {/* Canonical URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Canonical URL</label>
        <input
          type="text"
          value={seo.canonicalUrl}
          onChange={(e) => handleChange('canonicalUrl', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}

