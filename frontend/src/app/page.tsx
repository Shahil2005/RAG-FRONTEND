import { redirect } from 'next/navigation';

/** Fast entry: avoid blocking home on API during dev compile. */
export default function HomePage() {
  redirect('/login');
}
