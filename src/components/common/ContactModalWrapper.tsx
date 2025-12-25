'use client';

import ContactModal from '@/components/layout/ContactModal';
import { useContactModal } from '@/context/ContactModalContext';

export default function ContactModalWrapper() {
  const { isOpen, closeModal } = useContactModal();
  return <ContactModal isOpen={isOpen} onClose={closeModal} />;
}

