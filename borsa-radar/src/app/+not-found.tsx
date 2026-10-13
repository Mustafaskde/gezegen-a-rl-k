import { Redirect } from 'expo-router';

// Bilinmeyen bir bağlantıyla açılırsa ana ekrana yönlendir.
export default function NotFound() {
  return <Redirect href="/" />;
}
