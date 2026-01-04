import { getProviderConfig } from '@/utils/provider';
import BookingClient from '@/app/components/BookingClient';

export default async function Home(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> // Next.js 15+ searchParams is async promise
}) {
  const searchParams = await props.searchParams;
  const providerId = (searchParams.id as string) || null;

  let serviceName = 'Fortune Booking';

  if (providerId) {
    const config = await getProviderConfig(providerId);
    if (config) {
      serviceName = config.displayName;
    }
  }

  return (
    <BookingClient
      providerId={providerId}
      serviceName={serviceName}
    />
  );
}
