'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import AdminActressForm from '@/components/admin/AdminActressForm';

export default function AdminActressPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const isNew = id === 'new';
  const [loading, setLoading] = useState(!isNew);
  const [actress, setActress] = useState<any>(null);

  useEffect(() => {
    if (!isNew) {
      fetchActress();
    } else {
      setActress({
        isnew: 1,
        published: 1, // Default to unpublished (1) so admin can work on it
        isnewpix: 1,
        theirman: 0,
        godini: 3,
        firstname: '',
        middlenames: '',
        familiq: '',
        sources: '',
        timeline: [],
        books: [],
        links: [],
        images: [],
      });
      setLoading(false);
    }
  }, [id, isNew, router]);

  async function fetchActress() {
    try {
      const res = await fetch(`/api/admin/actresses/${id}`);
      if (res.ok) {
        const data = await res.json();
        setActress(data);
      }
    } catch (error) {
      console.error('Error fetching actress:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-[#d4c5a9] p-6">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#d4c5a9]">
      {/* Form Content */}
      <div className="bg-[#e9f8e8] px-6 py-6">
        {actress && (
          <AdminActressForm actress={actress} isNew={isNew} />
        )}
      </div>
    </div>
  );
}

