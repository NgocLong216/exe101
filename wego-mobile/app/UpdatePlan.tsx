import { Ionicons } from '@expo/vector-icons';
import { getCurrentUserProfile, hasActivePlus } from '@/apis/userAPI';
import { useFocusEffect } from '@react-navigation/native';
import { Href, router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform, 
  StatusBar
} from 'react-native';

const GREEN = '#22c55e';
const TEXT = '#111827';
const MUTED = '#6b7280';

type PlanId = 'free' | 'plus';

const plans: {
  id: PlanId;
  name: string;
  price: string;
  description: string;
  features: string[];
}[] = [
  {
    id: 'free',
    name: 'Free',
    price: '0₫',
    description: 'Everything you need to start planning together.',
    features: ['Create and join groups', 'Live location sharing', 'Shared schedules'],
  },
  {
    id: 'plus',
    name: 'WeGo Plus',
    price: '30,000₫',
    description: 'More tools for groups that are always on the go. Includes 30 days of access.',
    features: ['Everything in Free', 'Unlimited group history', 'AI trip checklists', 'Priority support'],
  },
];

export default function UpdatePlanScreen() {
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('plus');
  const [currentPlan, setCurrentPlan] = useState<PlanId>('free');
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
  const selected = plans.find((plan) => plan.id === selectedPlan)!;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getCurrentUserProfile()
        .then((profile) => {
          if (!active) return;
          const plan: PlanId = hasActivePlus(profile) ? 'plus' : 'free';
          setCurrentPlan(plan);
          setSelectedPlan(plan);
          setPlanExpiresAt(profile.planExpiresAt || null);
        })
        .catch((error) => console.warn('Could not load current plan', error));
      return () => { active = false; };
    }, [])
  );

  const continueWithPlan = () => {
    if (selectedPlan === 'free') {
      router.back();
      return;
    }

    router.push({
      pathname: '/Payment',
      params: {
        plan: selected.name,
        price: selected.price,
      },
    } as Href);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Go back"
          activeOpacity={0.7}
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Update plan</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroIcon}>
          <Ionicons name="sparkles" size={28} color={GREEN} />
        </View>
        <Text style={styles.title}>Choose the plan that fits you</Text>
        <Text style={styles.subtitle}>
          {currentPlan === 'plus'
            ? `Your current plan is WeGo Plus${planExpiresAt ? ` until ${new Date(planExpiresAt).toLocaleDateString()}` : ''}.`
            : 'Upgrade anytime. Your current plan is Free.'}
        </Text>

        <View style={styles.planList}>
          {plans.map((plan) => {
            const isSelected = plan.id === selectedPlan;
            const isPlus = plan.id === 'plus';

            return (
              <TouchableOpacity
                key={plan.id}
                activeOpacity={0.85}
                onPress={() => setSelectedPlan(plan.id)}
                style={[styles.planCard, isSelected && styles.selectedCard]}
              >
                {isPlus ? (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>RECOMMENDED</Text>
                  </View>
                ) : null}

                {plan.id === currentPlan ? (
                  <Text style={styles.currentPlanText}>CURRENT PLAN</Text>
                ) : null}

                <View style={styles.planHeader}>
                  <View style={styles.planHeading}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planDescription}>{plan.description}</Text>
                  </View>
                  <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected ? <View style={styles.radioDot} /> : null}
                  </View>
                </View>

                <View style={styles.priceRow}>
                  <Text style={styles.price}>{plan.price}</Text>
                  <Text style={styles.period}>{isPlus ? ' / 30 days' : ' forever'}</Text>
                </View>

                <View style={styles.divider} />
                {plan.features.map((feature) => (
                  <View key={feature} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={19} color={GREEN} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity activeOpacity={0.85} onPress={continueWithPlan} style={styles.continueButton}>
          <Text style={styles.continueText}>
            {selectedPlan === 'plus' ? `Continue with ${selected.name}` : 'Keep Free plan'}
          </Text>
          <Ionicons name="arrow-forward" size={19} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.footnote}>WeGo Plus is a one-time payment for 30 days and does not renew automatically.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb', paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 },
  header: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: TEXT },
  headerSpacer: { width: 38 },
  content: { paddingHorizontal: 20, paddingTop: 30, paddingBottom: 40 },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: {
    marginTop: 16,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '800',
    color: TEXT,
    textAlign: 'center',
  },
  subtitle: { marginTop: 8, fontSize: 14, color: MUTED, textAlign: 'center' },
  planList: { gap: 16, marginTop: 28 },
  planCard: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  selectedCard: { borderColor: GREEN, backgroundColor: '#f7fff9' },
  popularBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: GREEN,
    marginBottom: 13,
  },
  popularText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.7 },
  currentPlanText: { marginBottom: 10, color: GREEN, fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 14 },
  planHeading: { flex: 1 },
  planName: { fontSize: 19, fontWeight: '800', color: TEXT },
  planDescription: { marginTop: 5, fontSize: 13, lineHeight: 19, color: MUTED },
  radio: {
    width: 23,
    height: 23,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: GREEN },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: GREEN },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 16 },
  price: { fontSize: 25, fontWeight: '800', color: TEXT },
  period: { fontSize: 13, color: MUTED },
  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 },
  featureText: { flex: 1, fontSize: 14, color: '#374151' },
  continueButton: {
    marginTop: 24,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  continueText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  footnote: { marginTop: 12, textAlign: 'center', fontSize: 12, color: MUTED },
});
