import { createPayosPayment, getPayosPaymentStatus } from '@/apis/paymentAPI';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, StatusBar, Platform } from 'react-native';

const VIETQR = '#0068ff';
const TEXT = '#111827';
const MUTED = '#6b7280';

export default function PaymentScreen() {
  const params = useLocalSearchParams<{ plan?: string; orderId?: string; orderCode?: string; resultCode?: string }>();
  const [paying, setPaying] = useState(false);
  const plan = params.plan || 'WeGo Plus';
  const price = '₫30,000';

  useEffect(() => {
    const returnedOrderCode = params.orderCode || params.orderId;
    if (!returnedOrderCode) return;
    void finishPayment(returnedOrderCode);
  }, [params.orderCode, params.orderId]);

  const finishPayment = async (orderId: string) => {
    setPaying(true);
    try {
      // The webhook can arrive just after the browser redirect, so allow a short confirmation window.
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const status = await getPayosPaymentStatus(orderId);
        if (status === 'PAID') {
          Alert.alert('Payment successful', 'Your WeGo Plus payment has been confirmed.', [
            { text: 'Done', onPress: () => router.replace('/(tabs)/profile') },
          ]);
          return;
        }
        if (status === 'FAILED') throw new Error('The VietQR payment was not completed.');
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      Alert.alert('Payment processing', 'payOS is confirming your bank transfer. Please check again in a few minutes.');
    } catch (error) {
      Alert.alert('Payment not completed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setPaying(false);
    }
  };

  const payWithVietQR = async () => {
    if (paying) return;
    setPaying(true);
    try {
      const payment = await createPayosPayment();
      await WebBrowser.openAuthSessionAsync(payment.checkoutUrl, 'myapp://payment-result');
      await finishPayment(payment.orderCode);
    } catch (error) {
      Alert.alert('Unable to start payment', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityLabel="Go back" onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pay with VietQR</Text><View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.logo}><Ionicons name="qr-code" size={38} color="#fff" /></View>
        <Text style={styles.title}>Complete your payment</Text>
        <Text style={styles.subtitle}>Open payOS, scan the VietQR code with your banking app, and complete the transfer.</Text>

        <Text style={styles.sectionLabel}>ORDER SUMMARY</Text>
        <View style={styles.card}>
          <View style={styles.row}><Text style={styles.label}>Plan</Text><Text style={styles.value}>{plan}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Access</Text><Text style={styles.value}>30 days</Text></View>
          <View style={styles.divider} />
          <View style={styles.row}><Text style={styles.totalLabel}>Total</Text><Text style={styles.total}>{price}</Text></View>
        </View>

        <View style={styles.momoCard}>
          <View style={styles.wallet}><Ionicons name="business" size={25} color={VIETQR} /></View>
          <View style={{ flex: 1 }}><Text style={styles.methodTitle}>VietQR via payOS</Text><Text style={styles.methodText}>Transfer from any supported banking app</Text></View>
          <Ionicons name="checkmark-circle" size={24} color={VIETQR} />
        </View>

        <View style={styles.secure}><Ionicons name="shield-checkmark" size={17} color={MUTED} /><Text style={styles.secureText}>Your transaction is securely verified by payOS.</Text></View>
        <TouchableOpacity disabled={paying} onPress={payWithVietQR} style={[styles.payButton, paying && styles.disabled]}>
          {paying ? <ActivityIndicator color="#fff" /> : <><Ionicons name="open-outline" size={18} color="#fff" /><Text style={styles.payText}>Pay {price}</Text></>}
        </TouchableOpacity>
        <Text style={styles.terms}>By continuing, you agree to the WeGo Terms of Service.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb', paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 },
  header: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff' },
  backButton: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: TEXT }, headerSpacer: { width: 38 },
  content: { padding: 20, paddingBottom: 40 },
  logo: { alignSelf: 'center', marginTop: 12, width: 74, height: 74, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: VIETQR },
  logoText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  title: { marginTop: 16, textAlign: 'center', fontSize: 24, fontWeight: '800', color: TEXT },
  subtitle: { marginTop: 7, paddingHorizontal: 18, textAlign: 'center', lineHeight: 20, fontSize: 13, color: MUTED },
  sectionLabel: { marginTop: 28, marginBottom: 9, marginLeft: 4, fontSize: 11, fontWeight: '700', letterSpacing: 1, color: MUTED },
  card: { padding: 18, borderRadius: 18, backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, label: { fontSize: 14, color: MUTED }, value: { fontSize: 14, fontWeight: '700', color: TEXT },
  divider: { height: 1, marginVertical: 17, backgroundColor: '#e5e7eb' }, totalLabel: { fontSize: 16, fontWeight: '700', color: TEXT }, total: { fontSize: 20, fontWeight: '900', color: VIETQR },
  momoCard: { marginTop: 16, minHeight: 76, flexDirection: 'row', gap: 12, alignItems: 'center', padding: 16, borderWidth: 1.5, borderColor: VIETQR, borderRadius: 16, backgroundColor: '#f0f7ff' },
  wallet: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#dbeafe' }, methodTitle: { fontSize: 15, fontWeight: '800', color: TEXT }, methodText: { marginTop: 3, fontSize: 12, color: MUTED },
  secure: { marginTop: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7 }, secureText: { fontSize: 12, color: MUTED },
  payButton: { minHeight: 54, marginTop: 20, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: VIETQR }, disabled: { opacity: 0.6 }, payText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  terms: { marginTop: 12, textAlign: 'center', fontSize: 11, color: MUTED },
});
