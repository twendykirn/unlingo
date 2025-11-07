import { redirect } from 'next/navigation';
import { getSignInUrl } from '@workos-inc/authkit-nextjs';

export async function GET() {
    const signInUrl = await getSignInUrl();
    return redirect(signInUrl);
}
