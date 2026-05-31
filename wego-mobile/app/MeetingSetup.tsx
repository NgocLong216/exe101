import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  StatusBar,
} from "react-native";
import { ChevronLeft, ChevronDown, MapPin, Clock } from "lucide-react-native";

const COLORS = {
  primary: "#22C55E",
  primaryLight: "#DCFCE7",
  text: "#111827",
  textMuted: "#9CA3AF",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  background: "#F9FAFB",
  white: "#FFFFFF",
  card: "#FFFFFF",
};

const DAYS_OF_WEEK = ["S", "M", "T", "W", "T", "F", "S"];

const OCTOBER_2023 = {
  month: "October 2023",
  startDay: 0, // Sunday
  totalDays: 31,
  prevMonthDays: [28, 29, 30],
};

function buildCalendarGrid() {
  const grid: (number | null)[] = [
    ...OCTOBER_2023.prevMonthDays.map(() => null),
  ];
  for (let d = 1; d <= OCTOBER_2023.totalDays; d++) grid.push(d);
  while (grid.length % 7 !== 0) grid.push(null);
  return grid;
}

const PREV_DAYS = [28, 29, 30];

interface TimeScrollProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
}

function TimeScroll({ value, onChange, options }: TimeScrollProps) {
  const currentIndex = options.indexOf(value);
  const prev = options[(currentIndex - 1 + options.length) % options.length];
  const next = options[(currentIndex + 1) % options.length];

  return (
    <View style={styles.timeColumn}>
      <Text style={styles.timeAdjacentText}>{prev}</Text>
      <Text style={styles.timeActiveText}>{value}</Text>
      <Text style={styles.timeAdjacentText}>{next}</Text>
    </View>
  );
}

export default function MeetingSetup() {
  const [selectedDay, setSelectedDay] = useState(5);
  const [selectedGroup, setSelectedGroup] = useState("Beach Day Crew");
  const [hour, setHour] = useState("00");
  const [minute, setMinute] = useState("00");

  const hours = Array.from({ length: 24 }, (_, i) =>
    String(i).padStart(2, "0")
  );
  const minutes = Array.from({ length: 60 }, (_, i) =>
    String(i).padStart(2, "0")
  );

  const calendarGrid = buildCalendarGrid();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <ChevronLeft size={22} color={COLORS.text} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Set Meeting Details</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Meeting Point Card */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>MEETING POINT</Text>
          <View style={styles.meetingPointRow}>
            <View style={styles.meetingPointInfo}>
              <Text style={styles.meetingPointName}>Santa Monica Pier</Text>
              <Text style={styles.meetingPointAddress}>
                Ocean Ave, Santa Monica, CA{"\n"}90401
              </Text>
            </View>
            <View style={styles.mapThumbnail}>
              {/* Map placeholder with grid lines */}
              <View style={styles.mapPlaceholder}>
                <View style={styles.mapGrid} />
                <View style={[styles.mapGrid, styles.mapGridH]} />
                <View style={styles.mapDot} />
              </View>
            </View>
          </View>
        </View>

        {/* Select Group */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Group</Text>
          <TouchableOpacity style={styles.dropdownButton}>
            <View style={styles.dropdownLeft}>
              {/* Wave icon */}
              <View style={styles.waveIconContainer}>
                <Text style={styles.waveIcon}>〰</Text>
              </View>
              <Text style={styles.dropdownText}>{selectedGroup}</Text>
            </View>
            <ChevronDown size={18} color={COLORS.textMuted} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Calendar */}
        <View style={styles.section}>
          <View style={styles.calendarHeader}>
            <Text style={styles.sectionTitle}>Select Date</Text>
            <Text style={styles.monthLabel}>{OCTOBER_2023.month}</Text>
          </View>

          {/* Day headers */}
          <View style={styles.calendarRow}>
            {DAYS_OF_WEEK.map((d, i) => (
              <View key={i} style={styles.calendarCell}>
                <Text style={styles.dayHeader}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Calendar grid */}
          {Array.from({ length: calendarGrid.length / 7 }, (_, row) => (
            <View key={row} style={styles.calendarRow}>
              {calendarGrid.slice(row * 7, row * 7 + 7).map((day, col) => {
                const isPrev = row === 0 && col < PREV_DAYS.length;
                const isSelected = day === selectedDay && !isPrev;
                const isNull = day === null && !isPrev;
                const displayNum = isPrev
                  ? PREV_DAYS[col]
                  : day;

                return (
                  <TouchableOpacity
                    key={col}
                    style={styles.calendarCell}
                    onPress={() => {
                      if (day && !isPrev) setSelectedDay(day);
                    }}
                    disabled={!day || isPrev}
                  >
                    <View
                      style={[
                        styles.dayCircle,
                        isSelected && styles.dayCircleSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          isPrev && styles.dayTextMuted,
                          isNull && styles.dayTextMuted,
                          isSelected && styles.dayTextSelected,
                        ]}
                      >
                        {displayNum ?? ""}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        {/* Time Picker */}
        <View style={styles.timePicker}>
          <View style={styles.timePickerInner}>
            {/* Highlight bar */}
            <View style={styles.timeHighlight} />

            <View style={styles.timeRow}>
              <TimeScroll value={hour} onChange={setHour} options={hours} />
              <Text style={styles.timeSeparator}>:</Text>
              <TimeScroll
                value={minute}
                onChange={setMinute}
                options={minutes}
              />
            </View>
          </View>

          <View style={styles.timezoneRow}>
            <Clock size={12} color={COLORS.textMuted} strokeWidth={2} />
            <Text style={styles.timezoneText}>
              Times shown are in your local timezone
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.confirmButton}>
            <Text style={styles.confirmText}>Confirm Meeting</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 16 : 52,
    paddingBottom: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Card
  card: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.primary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  meetingPointRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  meetingPointInfo: {
    flex: 1,
    paddingRight: 12,
  },
  meetingPointName: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 3,
  },
  meetingPointAddress: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  mapThumbnail: {
    width: 72,
    height: 56,
    borderRadius: 8,
    overflow: "hidden",
  },
  mapPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E8F4E8",
    justifyContent: "center",
    alignItems: "center",
  },
  mapGrid: {
    position: "absolute",
    width: "100%",
    height: 1,
    backgroundColor: "#B8D8B8",
    top: "50%",
  },
  mapGridH: {
    width: 1,
    height: "100%",
    left: "50%",
    top: 0,
  },
  mapDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.white,
  },

  // Section
  section: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
  },

  // Dropdown
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  waveIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  waveIcon: {
    fontSize: 14,
    color: COLORS.primary,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
    marginTop: 12,
    opacity: 0.6,
    borderStyle: "dashed",
  },

  // Calendar
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  monthLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
  calendarRow: {
    flexDirection: "row",
  },
  calendarCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 3,
  },
  dayHeader: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  dayCircleSelected: {
    backgroundColor: COLORS.primary,
  },
  dayText: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.text,
  },
  dayTextMuted: {
    color: COLORS.border,
  },
  dayTextSelected: {
    color: COLORS.white,
    fontWeight: "700",
  },

  // Time Picker
  timePicker: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    alignItems: "center",
  },
  timePickerInner: {
    width: 160,
    position: "relative",
  },
  timeHighlight: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    marginTop: -20,
    height: 40,
    backgroundColor: COLORS.background,
    borderRadius: 10,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  timeColumn: {
    width: 60,
    alignItems: "center",
  },
  timeActiveText: {
    fontSize: 32,
    fontWeight: "300",
    color: COLORS.primary,
    height: 40,
    lineHeight: 40,
    textAlign: "center",
  },
  timeAdjacentText: {
    fontSize: 24,
    fontWeight: "300",
    color: COLORS.textMuted,
    height: 36,
    lineHeight: 36,
    textAlign: "center",
  },
  timeSeparator: {
    fontSize: 28,
    fontWeight: "300",
    color: COLORS.textMuted,
    marginHorizontal: 4,
    marginTop: -8,
  },
  timezoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 12,
  },
  timezoneText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },

  // Actions
  actions: {
    marginHorizontal: 16,
    marginTop: 20,
    gap: 10,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.white,
    letterSpacing: 0.2,
  },
  cancelButton: {
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
});