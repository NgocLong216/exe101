import { saveHobbyPreferences } from '@/apis/hobbyAPI';
import { Ionicons } from '@expo/vector-icons';
import { Href, router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const GREEN = '#22c55e';
const DESTINATIONS = ['Coffee', 'Buffet', 'BBQ', 'Restaurants', 'Street food', 'Parks', 'Shopping', 'Hotels'];
const VIBES = ['Cosy', 'Quiet', 'Luxury', 'Romantic', 'Trendy', 'Family-friendly', 'Budget-friendly', 'Outdoor'];

function ChoiceChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.chip, selected && styles.selectedChip]}>
      {selected && <Ionicons name="checkmark" size={16} color="#fff" />}
      <Text style={[styles.chipText, selected && styles.selectedChipText]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function HobbyPreferencesScreen() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [destinations, setDestinations] = useState<string[]>([]);
  const [vibes, setVibes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggle = (value: string, values: string[], setter: (nextValues: string[]) => void) => {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  };

  const continueToApp = async () => {
    if (destinations.length === 0 && vibes.length === 0) {
      Alert.alert('Choose your interests', 'Select at least one option so WeGo can personalize your experience.');
      return;
    }
    setSaving(true);
    try {
      await saveHobbyPreferences(destinations, vibes);
      router.replace((next || '/(tabs)') as Href);
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.icon}><Ionicons name="sparkles" size={30} color={GREEN} /></View>
        <Text style={styles.title}>What do you enjoy?</Text>
        <Text style={styles.subtitle}>Pick a few interests. We’ll use them to make WeGo recommendations feel more like you.</Text>

        <Text style={styles.sectionTitle}>DESTINATIONS</Text>
        <View style={styles.options}>
          {DESTINATIONS.map((item) => <ChoiceChip key={item} label={item} selected={destinations.includes(item)} onPress={() => toggle(item, destinations, setDestinations)} />)}
        </View>

        <Text style={styles.sectionTitle}>VIBE</Text>
        <View style={styles.options}>
          {VIBES.map((item) => <ChoiceChip key={item} label={item} selected={vibes.includes(item)} onPress={() => toggle(item, vibes, setVibes)} />)}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity disabled={saving} onPress={continueToApp} style={[styles.continueButton, saving && styles.disabled]}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.continueText}>Continue</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 24, paddingTop: 56, paddingBottom: 30 },
  icon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#dcfce7' },
  title: { marginTop: 22, fontSize: 29, fontWeight: '900', color: '#0f172a' },
  subtitle: { marginTop: 10, fontSize: 15, lineHeight: 22, color: '#64748b' },
  sectionTitle: { marginTop: 34, marginBottom: 13, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, color: '#64748b' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1.5, borderColor: '#dbe3eb', backgroundColor: '#fff' },
  selectedChip: { borderColor: GREEN, backgroundColor: GREEN },
  chipText: { fontSize: 14, fontWeight: '700', color: '#334155' },
  selectedChipText: { color: '#fff' },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#e2e8f0', backgroundColor: '#fff' },
  continueButton: { minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: GREEN },
  continueText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  disabled: { opacity: 0.6 },
});
