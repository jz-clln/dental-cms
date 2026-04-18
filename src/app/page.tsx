import { redirect } from 'next/navigation';

// Middleware handles the actual redirect logic.
// This is a fallback in case middleware doesn't fire.
export default function RootPage() {
  redirect('/dashboard');
}
