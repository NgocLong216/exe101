import { Redirect, useLocalSearchParams } from 'expo-router';

export default function PaymentResult() {
  const params = useLocalSearchParams<Record<string, string>>();
  return <Redirect href={{ pathname: '/Payment', params }} />;
}
