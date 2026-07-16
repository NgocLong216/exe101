import { createMomoPayment, getPaymentStatus } from '@/apis/paymentAPI';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, StatusBar, Platform } from 'react-native';

const MOMO = '#a50064';
const TEXT = '#111827';
const MUTED = '#6b7280';

export default function PaymentScreen() {
  const params = useLocalSearchParams<{ plan?: string; orderId?: string; resultCode?: string }>();
  const [paying, setPaying] = useState(false);
  const plan = params.plan || 'WeGo Plus';
  const price = '30,000₫';

  useEffect(() => {
    if (!params.orderId) return;
    void finishPayment(params.orderId);
  }, [params.orderId]);

  const finishPayment = async (orderId: string) => {
    setPaying(true);
    try {
      // IPN can arrive just after the browser redirect, so allow a short confirmation window.
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const status = await getPaymentStatus(orderId);
        if (status === 'PAID') {
          Alert.alert('Payment successful', 'Your WeGo Plus payment has been confirmed.', [
            { text: 'Done', onPress: () => router.replace('/(tabs)/profile') },
          ]);
          return;
        }
        if (status === 'FAILED') throw new Error('MoMo did not complete this payment.');
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      Alert.alert('Payment processing', 'MoMo is still confirming your payment. Please check again shortly.');
    } catch (error) {
      Alert.alert('Payment not completed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setPaying(false);
    }
  };

  const payWithMomo = async () => {
    if (paying) return;
    setPaying(true);
    try {
      const payment = await createMomoPayment();
      const result = await WebBrowser.openAuthSessionAsync(payment.payUrl, 'myapp://payment-result');
      if (result.type === 'success') await finishPayment(payment.orderId);
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
        <Text style={styles.headerTitle}>Pay with MoMo</Text><View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.logo}><Text style={styles.logoText}>MoMo</Text></View>
        <Text style={styles.title}>Complete your payment</Text>
        <Text style={styles.subtitle}>You’ll continue securely in MoMo to approve the transaction.</Text>

        <Text style={styles.sectionLabel}>ORDER SUMMARY</Text>
        <View style={styles.card}>
          <View style={styles.row}><Text style={styles.label}>Plan</Text><Text style={styles.value}>{plan}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Access</Text><Text style={styles.value}>30 days</Text></View>
          <View style={styles.divider} />
          <View style={styles.row}><Text style={styles.totalLabel}>Total</Text><Text style={styles.total}>{price}</Text></View>
        </View>

        <View style={styles.momoCard}>
          <View style={styles.wallet}><Ionicons name="wallet" size={25} color={MOMO} /></View>
          <View style={{ flex: 1 }}><Text style={styles.methodTitle}>MoMo wallet</Text><Text style={styles.methodText}>Fast and secure payment</Text></View>
          <Ionicons name="checkmark-circle" size={24} color={MOMO} />
        </View>

        <View style={styles.secure}><Ionicons name="shield-checkmark" size={17} color={MUTED} /><Text style={styles.secureText}>Payment is verified securely by MoMo.</Text></View>
        <TouchableOpacity disabled={paying} onPress={payWithMomo} style={[styles.payButton, paying && styles.disabled]}>
          {paying ? <ActivityIndicator color="#fff" /> : <><Ionicons name="open-outline" size={18} color="#fff" /><Text style={styles.payText}>Pay {price} with MoMo</Text></>}
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
  logo: { alignSelf: 'center', marginTop: 12, width: 74, height: 74, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: MOMO },
  logoText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  title: { marginTop: 16, textAlign: 'center', fontSize: 24, fontWeight: '800', color: TEXT },
  subtitle: { marginTop: 7, paddingHorizontal: 18, textAlign: 'center', lineHeight: 20, fontSize: 13, color: MUTED },
  sectionLabel: { marginTop: 28, marginBottom: 9, marginLeft: 4, fontSize: 11, fontWeight: '700', letterSpacing: 1, color: MUTED },
  card: { padding: 18, borderRadius: 18, backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, label: { fontSize: 14, color: MUTED }, value: { fontSize: 14, fontWeight: '700', color: TEXT },
  divider: { height: 1, marginVertical: 17, backgroundColor: '#e5e7eb' }, totalLabel: { fontSize: 16, fontWeight: '700', color: TEXT }, total: { fontSize: 20, fontWeight: '900', color: MOMO },
  momoCard: { marginTop: 16, minHeight: 76, flexDirection: 'row', gap: 12, alignItems: 'center', padding: 16, borderWidth: 1.5, borderColor: MOMO, borderRadius: 16, backgroundColor: '#fff7fb' },
  wallet: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fce7f3' }, methodTitle: { fontSize: 15, fontWeight: '800', color: TEXT }, methodText: { marginTop: 3, fontSize: 12, color: MUTED },
  secure: { marginTop: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7 }, secureText: { fontSize: 12, color: MUTED },
  payButton: { minHeight: 54, marginTop: 20, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: MOMO }, disabled: { opacity: 0.6 }, payText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  terms: { marginTop: 12, textAlign: 'center', fontSize: 11, color: MUTED },
});
