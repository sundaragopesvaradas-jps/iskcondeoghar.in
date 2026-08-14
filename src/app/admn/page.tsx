import { redirect } from 'next/navigation';
import { readSessionFromCookies } from '@/admn/admnAuth';

export default async function AdmnIndexPage() {
  const user = await readSessionFromCookies();
  redirect(user ? '/admn/console' : '/admn/login');
}
