import { redirect } from 'next/navigation';

// Redirect /explore to /explore/1930s (first gallery)
export default function ExplorePage() {
  redirect('/explore/1930s');
}
