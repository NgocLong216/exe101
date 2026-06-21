import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  StatusBar,
  Modal,
} from "react-native";
import { ChevronLeft, ChevronDown, MapPin, Clock } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getUserGroups, GroupResponse } from "@/apis/groupAPI";
import { scheduleMeet } from "@/apis/scheduleAPI";

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

function getMonthData(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay();
  const totalDays = lastDay.getDate();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return { year, month, totalDays, startDay, monthName: monthNames[month] };
}

function buildCalendarGrid(date: Date) {
  const { totalDays, startDay } = getMonthData(date);
  const grid: (number | null)[] = Array(startDay).fill(null);
  for (let d = 1; d <= totalDays; d++) grid.push(d);
  while (grid.length % 7 !== 0) grid.push(null);
  return grid;
}

interface TimeScrollProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
}

function TimeScroll({ value, onChange, options }: TimeScrollProps) {
  const scrollRef = React.useRef<ScrollView>(null);
  const currentIndex = options.indexOf(value);
  const [scrollOffset, setScrollOffset] = useState(0);

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setScrollOffset(offsetY);

    const itemHeight = 36;
    const selectedIndex = Math.round(offsetY / itemHeight);
    const clampedIndex = Math.max(0, Math.min(selectedIndex, options.length - 1));

    if (options[clampedIndex] && options[clampedIndex] !== value) {
      onChange(options[clampedIndex]);
    }
  };

  const handleMomentumScrollEnd = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const itemHeight = 36;
    const selectedIndex = Math.round(offsetY / itemHeight);
    const clampedIndex = Math.max(0, Math.min(selectedIndex, options.length - 1));

    const targetOffset = clampedIndex * itemHeight;
    scrollRef.current?.scrollTo({
      y: targetOffset,
      animated: true,
    });
  };

  useEffect(() => {
    const targetOffset = currentIndex * 36;
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: targetOffset,
        animated: false,
      });
    }, 100);
  }, []);

  return (
    <View style={styles.timeColumnContainer}>
      <ScrollView
        ref={scrollRef}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={36}
      >
        <View style={{ height: 72 }} />
        {options.map((item, index) => (
          <View key={item} style={styles.timeItem}>
            <Text
              style={[
                styles.timeItemText,
                index === currentIndex && styles.timeItemTextActive,
              ]}
            >
              {item}
            </Text>
          </View>
        ))}
        <View style={{ height: 72 }} />
      </ScrollView>
    </View>
  );
}

export default function MeetingSetup() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [hour, setHour] = useState("00");
  const [minute, setMinute] = useState("00");
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);

  const router = useRouter()
  const { placeId, placeName, lat, lng, prevRoute } = useLocalSearchParams<{
    placeId: string;
    placeName: string;
    lat: string;
    lng: string;
    prevRoute: string
  }>();

  const hours = Array.from({ length: 24 }, (_, i) =>
    String(i).padStart(2, "0")
  );
  const minutes = Array.from({ length: 60 }, (_, i) =>
    String(i).padStart(2, "0")
  );

  const calendarGrid = buildCalendarGrid(currentDate);
  const monthData = getMonthData(currentDate);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const isDateInPast = (day: number) => {
    const selectedDay = new Date(monthData.year, monthData.month, day);
    selectedDay.setHours(0, 0, 0, 0);
    const todayNormalized = new Date(today);
    todayNormalized.setHours(0, 0, 0, 0);
    return selectedDay < todayNormalized;
  };

  const handleSelectDay = (day: number) => {
    const selected = new Date(monthData.year, monthData.month, day);
    setSelectedDate(selected);
  };

  const handleConfirm = async () => {
    try {
      if (!selectedDate) {
        alert("Please select a date");
        return;
      }

      if (!selectedGroupId) {
        alert("Please select a group");
        return;
      }

      const meetingDateTime = new Date(selectedDate);

      const meetingTime =
        `${selectedDate.getFullYear()}-` +
        `${String(selectedDate.getMonth() + 1).padStart(2, "0")}-` +
        `${String(selectedDate.getDate()).padStart(2, "0")}T` +
        `${hour}:${minute}:00`;

      await scheduleMeet(selectedGroupId, {
        meetingTime,
        locationLat: Number(lat),
        locationLng: Number(lng),
        placeId,
      });

      router.push({
        pathname: "/(tabs)/schedule",
      });
    } catch (error) {
      console.error("Schedule meeting failed", error);
      alert("Failed to schedule meeting");
    }
  };

  useEffect(() => {
    const fetchGroups = async () => {
      const groupData = await getUserGroups();

      setGroups(groupData);

      if (groupData.length > 0) {
        setSelectedGroupId(groupData[0].id);
      }
    };

    fetchGroups();
  }, []);

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
              <Text style={styles.meetingPointName}>{placeName}</Text>
              {/* <Text style={styles.meetingPointAddress}>
                Ocean Ave, Santa Monica, CA{"\n"}90401
              </Text> */}
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
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowGroupDropdown(!showGroupDropdown)}
          >
            <View style={styles.dropdownLeft}>
              {/* Wave icon */}
              <View style={styles.waveIconContainer}>
                <Text style={styles.waveIcon}>〰</Text>
              </View>
              <Text style={styles.dropdownText}>
                {groups.find(g => g.id === selectedGroupId)?.title ??
                  "Select a group"}
              </Text>
            </View>
            <ChevronDown
              size={18}
              color={COLORS.textMuted}
              strokeWidth={2}
              style={{ transform: [{ rotate: showGroupDropdown ? '180deg' : '0deg' }] }}
            />
          </TouchableOpacity>

          {showGroupDropdown && (
            <View style={styles.dropdownList}>
              {groups.map((group) => (
                <TouchableOpacity
                  key={group.id}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedGroupId(group.id);
                    setShowGroupDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      selectedGroupId === group.id && styles.dropdownItemTextSelected
                    ]}
                  >
                    {group.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* Calendar */}
        <View style={styles.section}>
          <View style={styles.calendarHeader}>
            <Text style={styles.sectionTitle}>Select Date</Text>
          </View>

          {/* Month Navigation */}
          <View style={styles.monthNavigation}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={handlePrevMonth}
            >
              <ChevronLeft size={20} color={COLORS.primary} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {monthData.monthName} {monthData.year}
            </Text>
            <TouchableOpacity
              style={styles.navButton}
              onPress={handleNextMonth}
            >
              <ChevronLeft size={20} color={COLORS.primary} strokeWidth={2.5} style={{ transform: [{ rotate: '180deg' }] }} />
            </TouchableOpacity>
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
                const isNull = day === null;
                const isPast = day ? isDateInPast(day) : false;
                const isSelected = selectedDate &&
                  day === selectedDate.getDate() &&
                  selectedDate.getMonth() === monthData.month &&
                  selectedDate.getFullYear() === monthData.year;

                return (
                  <TouchableOpacity
                    key={col}
                    style={styles.calendarCell}
                    onPress={() => {
                      if (day && !isPast) handleSelectDay(day);
                    }}
                    disabled={isNull || isPast}
                  >
                    <View
                      style={[
                        styles.dayCircle,
                        isSelected && styles.dayCircleSelected,
                        isPast && styles.dayCircleDisabled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          isNull && styles.dayTextMuted,
                          isPast && styles.dayTextMuted,
                          isSelected && styles.dayTextSelected,
                        ]}
                      >
                        {day ?? ""}
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
          <Text style={styles.sectionTitle}>Select Time</Text>
          <View style={styles.timePickerInner}>
            {/* Highlight bar */}
            {/* <View style={styles.timeHighlight} /> */}

            <View style={styles.timeRow}>
              <TimeScroll value={hour} onChange={setHour} options={hours} />
              <Text style={styles.timeSeparator}>:</Text>
              <TimeScroll value={minute} onChange={setMinute} options={minutes} />
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
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirm}
          >
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
    paddingTop: Platform.OS === "android" ? 32 : 52,
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

  dropdownList: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    marginTop: 8,
    overflow: "hidden",
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.text,
  },
  dropdownItemTextSelected: {
    fontWeight: "600",
    color: COLORS.primary,
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
  monthNavigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
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
  dayCircleDisabled: {
    backgroundColor: COLORS.background,
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
    height: 180,
    position: "relative",
    overflow: "hidden",
  },
  timeHighlight: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    marginTop: -18,
    height: 36,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    zIndex: 10,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  timeColumnContainer: {
    width: 60,
    height: 180,
    overflow: "hidden",
    borderRadius: 8,
  },
  timeColumn: {
    width: 60,
    alignItems: "center",
  },
  timeItem: {
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  timeItemText: {
    fontSize: 24,
    fontWeight: "300",
    color: COLORS.textMuted,
  },
  timeItemTextActive: {
    fontSize: 32,
    fontWeight: "300",
    color: COLORS.primary,
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