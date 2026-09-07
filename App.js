import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, 
  TextInput, Dimensions, StatusBar, SafeAreaView, Platform, Alert, 
  Modal, FlatList, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, RefreshControl,
  Vibration, AppState, Switch
} from 'react-native';
import { Svg, Path, Rect, Line, Circle, Polygon, G, Text as SvgText } from 'react-native-svg';
import Slider from '@react-native-community/slider';
import * as Calendar from 'expo-calendar';
import * as Notifications from 'expo-notifications'; 
import { Pedometer } from 'expo-sensors';
import { Audio } from 'expo-av'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, differenceInSeconds, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';

// --- Notifications Config ---
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// --- Theme Config ---
const COLORS = {
  mint: '#14B8A6',
  blue: '#3B82F6',
  indigo: '#6366F1',
  purple: '#8B5CF6',
  pink: '#EC4899',
  orange: '#F97316',
};

const getTheme = (mode, primaryKey = 'mint') => {
  const primary = COLORS[primaryKey] || COLORS.mint;
  const isDark = mode === 'dark';
  
  return {
    mode,
    primary,
    bg: isDark ? '#121212' : '#F2F4F6',
    card: isDark ? '#1E1E1E' : '#FFFFFF',
    text: isDark ? '#F5F5F5' : '#191F28',
    subText: isDark ? '#A3A3A3' : '#8B95A1',
    border: isDark ? '#333333' : '#E5E8EB',
    inputBg: isDark ? '#2C2C2E' : '#F2F4F6',
    danger: '#EF4444',
    lightPrimary: isDark ? `${primary}30` : `${primary}15`, 
  };
};

// --- Styles ---
const baseStyles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 
  },
  content: { flex: 1 },
  screen: { 
    padding: 16, 
    paddingBottom: 100 
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingHorizontal: 4 },
  greeting: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  subGreeting: { fontSize: 14 },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  card: { borderRadius: 24, padding: 24, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', flexDirection: 'row', alignItems: 'center' },
  tabBar: { position: 'absolute', bottom: 0, width: '100%', height: 80, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start', paddingTop: 10, borderTopWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, elevation: 10, paddingBottom: 20 },
  tabItem: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  tabLabel: { fontSize: 10, marginTop: 4, fontWeight: '500' },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calDay: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginVertical: 2 },
  calDayText: { fontSize: 16, fontWeight: '500' },
  calEventDot: { width: 4, height: 4, borderRadius: 2, marginTop: 4 },
  // 수정됨: 모달 중앙 정렬 확실하게 (Wrapper와 Popup 분리)
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalPopup: { width: '90%', borderRadius: 24, padding: 24, shadowColor: '#000', elevation: 5, maxHeight: '85%' },
  focusContainer: { borderRadius: 32, padding: 30, alignItems: 'center', marginBottom: 16 },
  focusTimer: { fontWeight: 'bold', color: '#FFF', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginVertical: 20, textAlign: 'center' },
  modeToggleContainer: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 16 },
  modeToggleBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  modeText: { fontSize: 14, fontWeight: 'bold' },
});

const styles = baseStyles;

// --- Icons (SVG) ---
const Icon = ({ children, size = 24, color, style }) => (
  <View style={[{ width: size, height: size }, style]}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </Svg>
  </View>
);

const Icons = {
  Home: (props) => <Icon {...props}><Path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><Polygon points="9 22 9 12 15 12 15 22"/></Icon>,
  Calendar: (props) => <Icon {...props}><Rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><Line x1="16" x2="16" y1="2" y2="6"/><Line x1="8" x2="8" y1="2" y2="6"/><Line x1="3" x2="21" y1="10" y2="10"/></Icon>,
  Timer: (props) => <Icon {...props}><Line x1="10" x2="14" y1="2" y2="2"/><Line x1="12" x2="15" y1="14" y2="11"/><Circle cx="12" cy="14" r="8"/></Icon>,
  Chart: (props) => <Icon {...props}><Line x1="18" x2="18" y1="20" y2="10"/><Line x1="12" x2="12" y1="20" y2="4"/><Line x1="6" x2="6" y1="20" y2="14"/></Icon>,
  Settings: (props) => <Icon {...props}><Path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1-1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.39a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><Circle cx="12" cy="12" r="3"/></Icon>,
  Zap: (props) => <Icon {...props}><Polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></Icon>,
  Moon: (props) => <Icon {...props}><Path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></Icon>,
  Brain: (props) => <Icon {...props}><Path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><Path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></Icon>,
  Utensils: (props) => <Icon {...props}><Path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><Path d="M7 2v20"/><Path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></Icon>,
  Play: (props) => <Icon {...props}><Polygon points="5 3 19 12 5 21 5 3"/></Icon>,
  Pause: (props) => <Icon {...props}><Rect width="4" height="16" x="6" y="4"/><Rect width="4" height="16" x="14" y="4"/></Icon>,
  CheckCircle2: (props) => <Icon {...props}><Circle cx="12" cy="12" r="10"/><Path d="m9 12 2 2 4-4"/></Icon>,
  Edit3: (props) => <Icon {...props}><Path d="M12 20h9"/><Path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></Icon>,
  X: (props) => <Icon {...props}><Path d="M18 6 6 18"/><Path d="m6 6 12 12"/></Icon>,
  Headphones: (props) => <Icon {...props}><Path d="M3 14v-3a9 9 0 0 1 18 0v3"/><Path d="M2 19v-3a2 2 0 0 1 2-2h1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z"/><Path d="M22 19v-3a2 2 0 0 1-2-2h-1a2 2 0 0 1-2 2v3a2 2 0 0 1 2 2h1a2 2 0 0 1 2-2z"/></Icon>,
  AlarmClock: (props) => <Icon {...props}><Circle cx="12" cy="13" r="8"/><Path d="M12 9v4l2 2"/><Path d="M5 3 2 6"/><Path d="m22 6-3-3"/><Path d="M6.38 18.7 4 21"/><Path d="M17.64 18.67 20 21"/></Icon>,
  Activity: (props) => <Icon {...props}><Path d="M22 12h-4l-3 9L9 3l-3 9H2"/></Icon>,
  Pen: (props) => <Icon {...props}><Path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></Icon>,
  BookOpen: (props) => <Icon {...props}><Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><Path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></Icon>,
  Plus: (props) => <Icon {...props}><Path d="M5 12h14"/><Path d="M12 5v14"/></Icon>,
  Trash2: (props) => <Icon {...props}><Path d="M3 6h18"/><Path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><Path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><Line x1="10" x2="10" y1="11" y2="17"/><Line x1="14" x2="14" y1="11" y2="17"/></Icon>,
  Search: (props) => <Icon {...props}><Circle cx="11" cy="11" r="8"/><Line x1="21" x2="16.65" y1="21" y2="16.65"/></Icon>,
  ChevronLeft: (props) => <Icon {...props}><Path d="m15 18-6-6 6-6"/></Icon>,
  ChevronRight: (props) => <Icon {...props}><Path d="m9 18 6-6-6-6"/></Icon>,
  Save: (props) => <Icon {...props}><Path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><Path d="M17 21v-8H7v8"/><Path d="M7 3v5h8"/></Icon>,
  RotateCcw: (props) => <Icon {...props}><Path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><Path d="M3 3v5h5"/></Icon>,
  Calculator: (props) => <Icon {...props}><Rect width="16" height="20" x="4" y="2" rx="2"/><Line x1="8" x2="16" y1="6" y2="6"/><Line x1="16" x2="16" y1="14" y2="18"/><Path d="M16 10h.01"/><Path d="M12 10h.01"/><Path d="M8 10h.01"/><Path d="M12 14h.01"/><Path d="M8 14h.01"/><Path d="M12 18h.01"/><Path d="M8 18h.01"/></Icon>,
  Hourglass: (props) => <Icon {...props}><Path d="M5 22h14"/><Path d="M5 2h14"/><Path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><Path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></Icon>,
  GraduationCap: (props) => <Icon {...props}><Path d="M22 10v6M2 10l10-5 10 5-10 5z"/><Path d="M6 12v5c3 3 9 3 12 0v-5"/></Icon>,
  Palette: (props) => <Icon {...props}><Circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><Circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><Circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><Circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><Path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></Icon>,
  Check: (props) => <Icon {...props}><Path d="M20 6 9 17l-5-5"/></Icon>
};

// --- Reusable Components ---
const TimeScrollPicker = ({ value, onChange, range, suffix, theme }) => (
    <ScrollView style={{width: 60, height: 150}} contentContainerStyle={{alignItems:'center'}} showsVerticalScrollIndicator={false}>
        {range.map(i => (
            <TouchableOpacity key={i} onPress={()=>onChange(i)} style={{paddingVertical: 10, width:'100%', alignItems:'center'}}>
                <Text style={{fontSize: 24, fontWeight: value===i?'bold':'normal', color: value===i?theme.primary:theme.subText}}>{i.toString().padStart(2,'0')}</Text>
            </TouchableOpacity>
        ))}
    </ScrollView>
);

// --- API Functions ---
const NEIS_URL = 'https://open.neis.go.kr/hub';
const EXAM_SCHEDULE = [
  { id: 1, name: "1교시 국어", start: "08:40", end: "10:00", duration: 80 },
  { id: 2, name: "쉬는시간", start: "10:00", end: "10:20", duration: 20, type: 'break' },
  { id: 3, name: "2교시 수학", start: "10:30", end: "12:10", duration: 100 },
  { id: 4, name: "점심시간", start: "12:10", end: "13:10", duration: 60, type: 'break' },
  { id: 5, name: "3교시 영어", start: "13:10", end: "14:20", duration: 70 },
  { id: 6, name: "쉬는시간", start: "14:20", end: "14:40", duration: 20, type: 'break' },
  { id: 7, name: "4교시 한국사", start: "14:50", end: "15:20", duration: 30 },
  { id: 8, name: "대기(문제지 교체)", start: "15:20", end: "15:30", duration: 10, type: 'break' },
  { id: 9, name: "4교시 탐구1", start: "15:30", end: "16:00", duration: 30 },
  { id: 10, name: "대기(문제지 교체)", start: "16:00", end: "16:02", duration: 2, type: 'break' },
  { id: 11, name: "4교시 탐구2", start: "16:02", end: "16:32", duration: 30 },
  { id: 12, name: "쉬는시간", start: "16:32", end: "17:05", duration: 33, type: 'break' },
  { id: 13, name: "5교시 제2외국어", start: "17:05", end: "17:45", duration: 40 },
];

const fetchSchoolList = async (schoolName) => {
  try {
    const url = `${NEIS_URL}/schoolInfo?Type=json&SCHUL_NM=${encodeURIComponent(schoolName)}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.schoolInfo ? data.schoolInfo[1].row : [];
  } catch (e) {
    return [];
  }
};

const fetchSchoolDataWithCache = async (schoolName, grade, classNum) => {
  const today = format(new Date(), 'yyyyMMdd');
  const cacheKey = `schoolData_${schoolName}_${grade}_${classNum}_${today}_v8`;
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);

    const schoolList = await fetchSchoolList(schoolName);
    if (!schoolList || schoolList.length === 0) return { meal: "학교 정보 없음", timetable: null, schedule: [], weeklyTimetable: {} };
    const info = schoolList[0];
    
    // 급식
    const mealRes = await fetch(`${NEIS_URL}/mealServiceDietInfo?Type=json&ATPT_OFCDC_SC_CODE=${info.ATPT_OFCDC_SC_CODE}&SD_SCHUL_CODE=${info.SD_SCHUL_CODE}&MLSV_YMD=${today}`);
    const mealData = await mealRes.json();
    let meal = "급식 정보가 없습니다 🍚";
    if (mealData.mealServiceDietInfo) {
      const lunch = mealData.mealServiceDietInfo[1].row.find(r => r.MMEAL_SC_CODE === "2");
      if (lunch) meal = lunch.DDISH_NM.replace(/<br\/>/g, "\n").replace(/[0-9.]/g, "");
    }
    
    // 시간표
    const now = new Date();
    const startOfWeekDate = startOfWeek(now, { weekStartsOn: 1 });
    const endOfWeekDate = endOfWeek(now, { weekStartsOn: 1 });
    const tiFrom = format(startOfWeekDate, 'yyyyMMdd');
    const tiTo = format(endOfWeekDate, 'yyyyMMdd');
    
    const timeRes = await fetch(`${NEIS_URL}/hisTimetable?Type=json&ATPT_OFCDC_SC_CODE=${info.ATPT_OFCDC_SC_CODE}&SD_SCHUL_CODE=${info.SD_SCHUL_CODE}&GRADE=${grade}&CLASS_NM=${classNum}&TI_FROM_YMD=${tiFrom}&TI_TO_YMD=${tiTo}`);
    const timeData = await timeRes.json();

    let timetable = null;
    let weeklyTimetable = {};

    if (timeData.hisTimetable) {
        const rows = timeData.hisTimetable[1].row;
        rows.forEach(r => {
            const ymd = r.ALL_TI_YMD;
            const year = parseInt(ymd.substring(0,4));
            const month = parseInt(ymd.substring(4,6)) - 1;
            const day = parseInt(ymd.substring(6,8));
            const dateObj = new Date(year, month, day);
            const dayIdx = getDay(dateObj); 
            const dayMap = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
            const dayKey = dayMap[dayIdx];

            if (dayKey && dayIdx >= 1 && dayIdx <= 5) {
                if (!weeklyTimetable[dayKey]) weeklyTimetable[dayKey] = [];
                weeklyTimetable[dayKey].push({ period: r.PERIO, subject: r.ITRT_CNTNT });
            }

            if (ymd === today) {
                 if (!timetable) timetable = [];
                 timetable.push({ period: r.PERIO, subject: r.ITRT_CNTNT });
            }
        });
    }

    let schedule = [];
    const schedulePromises = [];
    for (let i = -3; i <= 3; i++) {
        const m = format(addMonths(now, i), 'yyyyMM');
        schedulePromises.push(fetch(`${NEIS_URL}/SchoolSchedule?Type=json&ATPT_OFCDC_SC_CODE=${info.ATPT_OFCDC_SC_CODE}&SD_SCHUL_CODE=${info.SD_SCHUL_CODE}&AA_YMD=${m}`).then(res => res.json()));
    }
    const results = await Promise.all(schedulePromises);
    results.forEach(res => {
        if (res.SchoolSchedule) {
            const rows = res.SchoolSchedule[1].row.map(r => ({ id: r.AA_YMD + r.EVENT_NM, title: r.EVENT_NM, date: r.AA_YMD }));
            schedule = [...schedule, ...rows];
        }
    });

    const result = { meal, timetable, weeklyTimetable, schedule, lastUpdated: Date.now() };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(result));
    return result;
  } catch (e) {
    return { meal: "로딩 실패", timetable: null, weeklyTimetable: {}, schedule: [] };
  }
};

// --- Helper Components ---
const DDayBattery = ({ name, date, theme }) => {
  const diffDays = Math.ceil((new Date(date) - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
  let dDayText = diffDays > 0 ? `D-${diffDays}` : diffDays === 0 ? "D-Day" : `D+${Math.abs(diffDays)}`;
  const rawPercentage = Math.max(0, Math.min(100, Math.round(((365 - diffDays) / 365) * 100)));
  return (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      <View style={styles.cardTitleRow}>
        <Text style={{fontSize: 14, fontWeight: '600', color: theme.subText}}>{name} <Text style={{color: theme.primary}}>{dDayText}</Text></Text>
        <Text style={{fontSize: 14, fontWeight: 'bold', color: theme.primary}}>{diffDays <= 0 ? 100 : rawPercentage}% 🔥</Text>
      </View>
      <View style={{height: 32, backgroundColor: theme.lightPrimary, borderRadius: 16, padding: 4, justifyContent: 'center'}}>
        <View style={{width: `${Math.max(rawPercentage, 10)}%`, height: '100%', backgroundColor: theme.primary, borderRadius: 12, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 8}}>
          <Icons.Zap size={14} color="#FFF" />
        </View>
      </View>
    </View>
  );
};

// 수정됨: BioCondition 팝업 중앙 정렬 및 텍스트 수정
const BioCondition = ({ steps, theme, onUpdateCondition, initialValues }) => {
    const [sleep, setSleep] = useState(6.5);
    const [focusLevel, setFocusLevel] = useState(3);
    const [sleepModalVisible, setSleepModalVisible] = useState(false);
    
    const [targetHour, setTargetHour] = useState(23);
    const [targetMinute, setTargetMinute] = useState(0);

    useEffect(() => {
        if (initialValues) {
            if (initialValues.sleep !== undefined) setSleep(initialValues.sleep);
            if (initialValues.focus !== undefined) setFocusLevel(initialValues.focus);
        }
    }, [initialValues]);

    const handleSleepComplete = (val) => onUpdateCondition(val, focusLevel);
    const handleFocusComplete = (val) => onUpdateCondition(sleep, val);

    const calcTimes = useMemo(() => {
      const d = new Date(); d.setHours(targetHour, targetMinute, 0, 0);
      const fallAsleep = new Date(d.getTime() + 14*60000);
      return [4,5,6].map(c => new Date(fallAsleep.getTime() + c*90*60000).toLocaleTimeString('ko-KR', {hour:'2-digit', minute:'2-digit', hour12:false}));
    }, [targetHour, targetMinute]);
  
    return (
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <View style={styles.cardTitleRow}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>오늘의 컨디션 💪</Text>
          <TouchableOpacity onPress={()=>setSleepModalVisible(true)} style={{backgroundColor: theme.lightPrimary, paddingHorizontal:12, paddingVertical:6, borderRadius:16}}>
            <Text style={{fontSize:12, fontWeight:'bold', color: theme.primary}}>🛌 언제 잘까요?</Text>
          </TouchableOpacity>
        </View>
        <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:16, backgroundColor: theme.mode === 'dark' ? '#3F1515' : '#FFF0F0', padding:12, borderRadius:12}}>
          <View style={{flexDirection:'row', alignItems:'center'}}><Icons.Activity size={20} color={theme.danger}/><Text style={{marginLeft:8, fontWeight:'bold', color:theme.danger}}>활동량 (만보기)</Text></View>
          <Text style={{fontSize:16, fontWeight:'bold', color:theme.danger}}>{steps} 걸음</Text>
        </View>
        
        <View style={{marginBottom: 16}}>
          <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom: 8}}>
            <View style={{flexDirection:'row', alignItems:'center'}}><Icons.Moon size={16} color={theme.subText}/><Text style={{marginLeft:6, color:theme.subText}}>수면 시간</Text></View>
            <Text style={{fontWeight:'bold', color:theme.primary}}>{sleep}h</Text>
          </View>
          <Slider style={{width: '100%', height: 40}} minimumValue={0} maximumValue={12} step={0.5} value={sleep} onValueChange={setSleep} onSlidingComplete={handleSleepComplete} minimumTrackTintColor={theme.primary} maximumTrackTintColor={theme.border} thumbTintColor={theme.primary}/>
        </View>
        <View>
          <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom: 8}}>
            <View style={{flexDirection:'row', alignItems:'center'}}><Icons.Brain size={16} color={theme.subText}/><Text style={{marginLeft:6, color:theme.subText}}>오늘의 집중력</Text></View>
            <Text style={{fontWeight:'bold', color:theme.primary}}>{focusLevel}점</Text>
          </View>
          <Slider style={{width: '100%', height: 40}} minimumValue={1} maximumValue={5} step={1} value={focusLevel} onValueChange={setFocusLevel} onSlidingComplete={handleFocusComplete} minimumTrackTintColor={theme.primary} maximumTrackTintColor={theme.border} thumbTintColor={theme.primary}/>
        </View>

        {/* 중앙 정렬을 위한 구조 변경 */}
        <Modal visible={sleepModalVisible} transparent animationType="fade" onRequestClose={()=>setSleepModalVisible(false)}>
            <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback onPress={()=>setSleepModalVisible(false)}>
                    <View style={StyleSheet.absoluteFill} />
                </TouchableWithoutFeedback>
                <View style={[styles.modalPopup, { backgroundColor: theme.card }]}>
                    <Text style={{fontSize:18, fontWeight:'bold', marginBottom:16, textAlign:'center', color:theme.text}}>수면 시간 설정 🌙</Text>
                    <View style={{flexDirection:'row', justifyContent:'center', alignItems:'center', height: 150, marginBottom: 20}}>
                        <TimeScrollPicker value={targetHour} onChange={setTargetHour} range={Array.from({length:24},(_,i)=>i)} theme={theme} />
                        <Text style={{fontSize:24, fontWeight:'bold', marginHorizontal:10, color:theme.text}}>:</Text>
                        <TimeScrollPicker value={targetMinute} onChange={setTargetMinute} range={[0, 15, 30, 45]} theme={theme} />
                    </View>
                    <View style={{backgroundColor: theme.inputBg, borderRadius:12, padding:16}}>
                        <Text style={{textAlign:'center', marginBottom:10, color:theme.text}}>이 시간에 일어나세요 ☀️</Text>
                        <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                            {calcTimes.map((t, i) => (
                                <View key={i} style={{alignItems:'center'}}>
                                    <Text style={{fontSize:16, fontWeight:'bold', color:theme.primary}}>{t}</Text>
                                    <Text style={{fontSize:10, color:theme.subText, marginTop:4}}>{i===1 ? '강력 추천 ⭐' : (i===0?'최소 수면':'충분한 수면')}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                    <TouchableOpacity onPress={()=>setSleepModalVisible(false)} style={{marginTop:20, alignItems:'center', padding:10}}>
                        <Text style={{color:theme.subText}}>닫기</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
      </View>
    );
};

const MiniCalendarCard = ({ events, theme, onNavigate }) => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const todaysEvents = events[todayKey] || [];
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={onNavigate} style={[baseStyles.card, { backgroundColor: theme.card }]}>
        <View style={baseStyles.cardTitleRow}>
          <View style={{flexDirection:'row', alignItems:'center'}}><Icons.Calendar size={20} color={theme.primary} style={{marginRight: 8}}/><Text style={[baseStyles.cardTitle, { color: theme.text }]}>오늘의 일정 ({todaysEvents.length})</Text></View>
          <Icons.ChevronRight size={16} color={theme.subText}/>
        </View>
        {todaysEvents.length === 0 ? <Text style={{color:theme.subText, fontSize:12}}>오늘 일정이 없습니다.</Text> : todaysEvents.slice(0,3).map((e, i) => (
          <View key={i} style={{flexDirection:'row', alignItems:'center', marginBottom:12}}>
            <View style={{width:4, height:4, borderRadius:2, backgroundColor:theme.primary, marginRight:8}}/><Text style={{fontSize:14, fontWeight:'bold', color:theme.text}}>{e.title}</Text>
          </View>
        ))}
      </TouchableOpacity>
    );
};

// ... TimetableEditorModal & WeeklyTimetableViewer & TimeTableCard ...
// (기존 코드와 동일, 생략 없이 전체 코드에 포함됨)
const TimetableEditorModal = ({ visible, onClose, timetable, onSave, theme }) => {
    const [mode, setMode] = useState('daily');
    const [localTimetable, setLocalTimetable] = useState(timetable || []);
    const [weeklyData, setWeeklyData] = useState({ MON: [], TUE: [], WED: [], THU: [], FRI: [] });
    const [selectedDay, setSelectedDay] = useState('MON');
    const [applyToAllWeeks, setApplyToAllWeeks] = useState(false);

    useEffect(() => {
        if (!timetable || timetable.length === 0) setLocalTimetable(Array.from({length: 7}, (_, i) => ({ period: i + 1, subject: '' })));
        else setLocalTimetable(timetable);
        
        const emptyDay = Array.from({length: 7}, (_, i) => ({ period: i + 1, subject: '' }));
        setWeeklyData({ MON: [...emptyDay], TUE: [...emptyDay], WED: [...emptyDay], THU: [...emptyDay], FRI: [...emptyDay] });
    }, [timetable, visible]);

    const handleSubjectChange = (idx, text) => {
        if (mode === 'daily') {
            const newT = [...localTimetable];
            newT[idx] = { ...newT[idx], subject: text };
            setLocalTimetable(newT);
        } else {
            const newWeek = { ...weeklyData };
            newWeek[selectedDay][idx] = { ...newWeek[selectedDay][idx], subject: text };
            setWeeklyData(newWeek);
        }
    };
    const addPeriod = () => {
        if (mode === 'daily') setLocalTimetable([...localTimetable, { period: localTimetable.length + 1, subject: '' }]);
        else { const newWeek = { ...weeklyData }; newWeek[selectedDay].push({ period: newWeek[selectedDay].length + 1, subject: '' }); setWeeklyData(newWeek); }
    };
    const removePeriod = () => {
        if (mode === 'daily' && localTimetable.length > 0) setLocalTimetable(localTimetable.slice(0, -1));
        else if (mode === 'weekly' && weeklyData[selectedDay].length > 0) { const newWeek = { ...weeklyData }; newWeek[selectedDay].pop(); setWeeklyData(newWeek); }
    };
    const handleSaveInternal = () => {
        if (mode === 'daily') onSave(localTimetable, false);
        else onSave(weeklyData, true); 
        onClose();
    };
    const currentData = mode === 'daily' ? localTimetable : weeklyData[selectedDay];

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
             <SafeAreaView style={{flex:1, backgroundColor: theme.card}}>
                 <View style={{padding:16, borderBottomWidth:1, borderColor:theme.border}}>
                     <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
                        <Text style={{fontSize:18, fontWeight:'bold', color: theme.text}}>시간표 수정 ✏️</Text>
                        <TouchableOpacity onPress={onClose}><Icons.X size={24} color={theme.text}/></TouchableOpacity>
                     </View>
                     <View style={{flexDirection:'row', backgroundColor:theme.inputBg, borderRadius:8, padding:2}}>
                         <TouchableOpacity onPress={()=>setMode('daily')} style={{flex:1, paddingVertical:8, alignItems:'center', backgroundColor:mode==='daily'?theme.card:'transparent', borderRadius:6}}><Text style={{fontWeight:mode==='daily'?'bold':'normal', color:theme.text}}>오늘만 수정</Text></TouchableOpacity>
                         <TouchableOpacity onPress={()=>setMode('weekly')} style={{flex:1, paddingVertical:8, alignItems:'center', backgroundColor:mode==='weekly'?theme.card:'transparent', borderRadius:6}}><Text style={{fontWeight:mode==='weekly'?'bold':'normal', color:theme.text}}>이번 주 수정</Text></TouchableOpacity>
                     </View>
                     {mode === 'weekly' && (
                         <View style={{flexDirection:'row', justifyContent:'space-between', marginTop:10}}>
                             {Object.keys(weeklyData).map(day => (
                                 <TouchableOpacity key={day} onPress={()=>setSelectedDay(day)} style={{paddingVertical:6, paddingHorizontal:10, borderRadius:12, backgroundColor:selectedDay===day?theme.primary:theme.inputBg}}>
                                     <Text style={{color:selectedDay===day?'#FFF':theme.subText, fontSize:12}}>{day}</Text>
                                 </TouchableOpacity>
                             ))}
                         </View>
                     )}
                 </View>
                 <ScrollView style={{padding:16}}>
                     {currentData.map((t, i) => (
                         <View key={i} style={{flexDirection:'row', alignItems:'center', marginBottom:12}}>
                             <Text style={{width:40, color: theme.subText}}>{t.period}교시</Text>
                             <TextInput style={{flex:1, backgroundColor: theme.inputBg, padding:10, borderRadius:8, color: theme.text}} value={t.subject} onChangeText={(tx) => handleSubjectChange(i, tx)} placeholder="과목 입력" placeholderTextColor={theme.subText}/>
                         </View>
                     ))}
                     <View style={{flexDirection:'row', justifyContent:'space-between', marginTop:10, marginBottom: 20}}>
                         <TouchableOpacity onPress={addPeriod} style={{padding:10, backgroundColor:theme.inputBg, borderRadius:8, flex:1, marginRight:5, alignItems:'center'}}><Text style={{color:theme.text}}>+ 교시 추가</Text></TouchableOpacity>
                         <TouchableOpacity onPress={removePeriod} style={{padding:10, backgroundColor:theme.inputBg, borderRadius:8, flex:1, marginLeft:5, alignItems:'center'}}><Text style={{color:theme.danger}}>- 교시 삭제</Text></TouchableOpacity>
                     </View>
                     {mode === 'weekly' && (
                         <View style={{flexDirection:'row', alignItems:'center', marginBottom:20}}>
                             <Switch value={applyToAllWeeks} onValueChange={setApplyToAllWeeks} trackColor={{false: theme.inputBg, true: theme.primary}}/>
                             <Text style={{marginLeft:10, color:theme.text}}>매주 이 요일 반복 적용</Text>
                         </View>
                     )}
                 </ScrollView>
                 <View style={{padding:16, borderTopWidth:1, borderColor:theme.border}}>
                     <TouchableOpacity onPress={handleSaveInternal} style={{backgroundColor:theme.primary, padding:16, borderRadius:16, alignItems:'center'}}><Text style={{color:'#FFF', fontWeight:'bold'}}>저장하기</Text></TouchableOpacity>
                 </View>
             </SafeAreaView>
        </Modal>
    );
};

const WeeklyTimetableViewer = ({ visible, onClose, weeklyTimetable, todayTimetable, theme }) => {
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
    const todayIndex = getDay(new Date()); 
    const todayStr = days[todayIndex - 1]; 
    
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={baseStyles.modalOverlay}>
                <TouchableWithoutFeedback onPress={onClose}><View style={{position:'absolute', top:0, left:0, right:0, bottom:0}} /></TouchableWithoutFeedback>
                <View style={[baseStyles.modalPopup, { backgroundColor: theme.card, width: '95%', maxHeight: '80%' }]}>
                    <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
                          <Text style={{fontSize:18, fontWeight:'bold', color: theme.text}}>주간 시간표 📅</Text>
                          <TouchableOpacity onPress={onClose}><Icons.X size={24} color={theme.text}/></TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={{flexGrow: 1}}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={{flexDirection:'row'}}>
                                {days.map((day, dIdx) => {
                                    const isToday = (todayStr === day);
                                    let periods = weeklyTimetable && weeklyTimetable[day] ? weeklyTimetable[day] : [];
                                    if (periods.length === 0) periods = Array(7).fill({period: '-', subject: ''});

                                    return (
                                        <View key={day} style={{width: 60, marginRight: 4, alignItems:'center'}}>
                                            <View style={{backgroundColor: isToday ? theme.primary : theme.inputBg, paddingVertical:6, width:'100%', borderRadius:8, alignItems:'center', marginBottom:8}}>
                                                <Text style={{fontWeight:'bold', fontSize:12, color: isToday ? '#FFF' : theme.text}}>{day}</Text>
                                            </View>
                                            {periods.map((p, pIdx) => (
                                                <View key={pIdx} style={{width:'100%', height: 45, backgroundColor: theme.inputBg, marginBottom: 4, borderRadius: 6, justifyContent:'center', alignItems:'center', padding: 2}}>
                                                    <Text style={{fontSize: 9, color: theme.subText}}>{pIdx+1}</Text>
                                                    <Text style={{fontSize: 10, fontWeight:'bold', color: theme.text, textAlign:'center'}} numberOfLines={2}>{p.subject || '-'}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )
                                })}
                            </View>
                        </ScrollView>
                    </ScrollView>
                    <TouchableOpacity onPress={onClose} style={{marginTop: 16, alignItems:'center'}}>
                        <Text style={{color: theme.subText}}>닫기</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const TimeTableCard = ({ timetable, theme, onEdit, onPress }) => {
    const todayStr = format(new Date(), 'MM.dd');
    return (
        <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[baseStyles.card, { backgroundColor: theme.card }]}>
          <View style={baseStyles.cardTitleRow}>
            <View style={{flexDirection:'row', alignItems:'center'}}><Icons.BookOpen size={20} color={theme.primary} style={{marginRight: 8}}/><Text style={[baseStyles.cardTitle, { color: theme.text }]}>오늘의 시간표 <Text style={{fontSize:12, fontWeight:'normal', color:theme.subText}}>{todayStr}</Text></Text></View>
            <TouchableOpacity onPress={onEdit}><Icons.Pen size={16} color={theme.subText}/></TouchableOpacity>
          </View>
          {timetable && timetable.length > 0 ? (
            <View style={{flexDirection: 'row', justifyContent: 'space-between', flexWrap:'wrap'}}>
              {timetable.map((t, i) => (
                <View key={i} style={{alignItems: 'center', width: '13%', marginBottom: 4}}>
                  <Text style={{fontSize: 10, color: theme.subText, marginBottom: 4}}>{t.period}</Text>
                  <View style={{backgroundColor: theme.inputBg, borderRadius: 8, paddingVertical: 8, width: '100%', alignItems: 'center'}}><Text style={{fontSize: 11, fontWeight: 'bold', color: theme.text}} numberOfLines={1}>{t.subject}</Text></View>
                </View>
              ))}
            </View>
          ) : <Text style={{color:theme.subText, fontSize:12}}>시간표 정보 없음 (주말/휴일)</Text>}
        </TouchableOpacity>
    );
};

const CircularPlanner = ({ plans = [], onAddPlan, onDeletePlan, theme }) => {
    const radius = 100;
    const center = 130; 
    const svgSize = 260; 

    const [modalVisible, setModalVisible] = useState(false);
    const [startH, setStartH] = useState(0);
    const [endH, setEndH] = useState(0);
    const [title, setTitle] = useState("");
    const [color, setColor] = useState(theme.primary);

    const getCoordinatesForAngle = (angle) => {
        const rad = (angle - 90) * Math.PI / 180;
        return {
            x: center + radius * Math.cos(rad),
            y: center + radius * Math.sin(rad)
        };
    };

    const createSector = (startHour, endHour, color, label) => {
        const startAngle = (startHour / 24) * 360;
        const endAngle = (endHour / 24) * 360;
        const start = getCoordinatesForAngle(startAngle);
        const end = getCoordinatesForAngle(endAngle);
        const largeArc = endAngle - startAngle > 180 ? 1 : 0;
        
        const midAngle = (startAngle + endAngle) / 2;
        const textRad = (midAngle - 90) * Math.PI / 180;
        const textR = radius * 0.7; 
        const tx = center + textR * Math.cos(textRad);
        const ty = center + textR * Math.sin(textRad);
        
        return (
            <React.Fragment key={`${startHour}-${endHour}-${label}`}>
                <Path d={`M${center},${center} L${start.x},${start.y} A${radius},${radius} 0 ${largeArc},1 ${end.x},${end.y} Z`} fill={color} opacity={0.6} />
                <SvgText x={tx} y={ty} fontSize="10" fill="#FFF" textAnchor="middle" fontWeight="bold" alignmentBaseline="middle">{label}</SvgText>
            </React.Fragment>
        );
    };

    const handleSave = () => {
        const isOverlap = plans.some(p => {
             return (startH >= p.start && startH < p.end) || 
                    (endH > p.start && endH <= p.end) ||
                    (startH <= p.start && endH >= p.end);
        });

        if (startH >= endH) {
             Alert.alert("오류", "종료 시간은 시작 시간보다 늦어야 합니다.");
             return;
        }
        if (isOverlap) {
             Alert.alert("오류", "이미 계획된 시간입니다! 시간을 조정해주세요.");
             return;
        }
        if (title.trim() === "") {
             Alert.alert("오류", "할 일을 입력해주세요.");
             return;
        }

        onAddPlan({ id: Date.now(), start: startH, end: endH, title, color });
        setModalVisible(false);
        setStartH(0); setEndH(0); setTitle("");
    };

    return (
        <View style={[baseStyles.card, { backgroundColor: theme.card }]}>
            <View style={baseStyles.cardTitleRow}>
                <Text style={[baseStyles.cardTitle, { color: theme.text }]}>생활 계획표 🕘</Text>
                <TouchableOpacity onPress={() => setModalVisible(true)}><Icons.Plus size={20} color={theme.primary}/></TouchableOpacity>
            </View>
            <View style={{alignItems:'center'}}>
                <Svg height={svgSize} width={svgSize}>
                    <Circle cx={center} cy={center} r={radius} stroke={theme.border} strokeWidth="2" fill="none"/>
                    {[0, 6, 12, 18].map(h => {
                         const pos = getCoordinatesForAngle((h/24)*360);
                         let tx = pos.x; 
                         let ty = pos.y;
                         if(h===6) tx += 10;
                         if(h===18) tx -= 10;
                         if(h===12) ty += 12;
                         if(h===0) ty -= 8;

                         return <SvgText key={h} x={tx} y={ty} fontSize="12" fill={theme.subText} textAnchor="middle">{h}</SvgText>;
                    })}
                    {plans.map(p => createSector(p.start, p.end, p.color, p.title))}
                </Svg>
            </View>
            
            <View style={{marginTop: 10}}>
                {plans.length === 0 ? <Text style={{textAlign:'center', color:theme.subText, fontSize:12}}>계획을 추가해보세요!</Text> : 
                 plans.sort((a,b)=>a.start-b.start).map((p) => (
                    <View key={p.id} style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8, backgroundColor:theme.inputBg, padding:8, borderRadius:8}}>
                        <View style={{flexDirection:'row', alignItems:'center'}}>
                            <View style={{width:10, height:10, borderRadius:5, backgroundColor:p.color, marginRight:8}}/>
                            <Text style={{color:theme.text, fontWeight:'bold', marginRight:8}}>{p.start}시~{p.end}시</Text>
                            <Text style={{color:theme.text}}>{p.title}</Text>
                        </View>
                        <TouchableOpacity onPress={()=>onDeletePlan(p.id)}>
                            <Icons.Trash2 size={16} color={theme.subText}/>
                        </TouchableOpacity>
                    </View>
                ))}
            </View>

            <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={()=>setModalVisible(false)}>
                <View style={baseStyles.modalOverlay}>
                    <View style={[baseStyles.modalPopup, { backgroundColor: theme.card }]}>
                        <Text style={{fontSize:16, fontWeight:'bold', marginBottom:10, color: theme.text}}>계획 추가</Text>
                        <TextInput style={{backgroundColor:theme.inputBg, padding:10, borderRadius:8, marginBottom:10, color: theme.text}} placeholderTextColor={theme.subText} placeholder="할 일 (예: 잠)" value={title} onChangeText={setTitle}/>
                        
                        <View style={{flexDirection:'row', justifyContent:'center', height:120, marginBottom:10}}>
                            <View style={{alignItems:'center'}}>
                                <Text style={{fontSize:12, color:theme.subText, marginBottom:4}}>시작</Text>
                                <TimeScrollPicker value={startH} onChange={setStartH} range={Array.from({length:24},(_,i)=>i)} theme={theme} />
                            </View>
                            <Text style={{fontSize:20, marginTop:40, marginHorizontal:10, color:theme.subText}}>~</Text>
                            <View style={{alignItems:'center'}}>
                                <Text style={{fontSize:12, color:theme.subText, marginBottom:4}}>종료</Text>
                                <TimeScrollPicker value={endH} onChange={setEndH} range={Array.from({length:25},(_,i)=>i)} theme={theme} />
                            </View>
                        </View>

                        <View style={{flexDirection:'row', gap:5, marginBottom:20, flexWrap: 'wrap'}}>
                            {[theme.primary, theme.danger, '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'].map(c => (
                                <TouchableOpacity key={c} onPress={()=>setColor(c)} style={{width:24, height:24, borderRadius:12, backgroundColor:c, borderWidth: color===c?2:0, borderColor:theme.text}}/>
                            ))}
                        </View>
                        <TouchableOpacity onPress={handleSave} style={{backgroundColor:theme.primary, padding:10, borderRadius:8, alignItems:'center'}}><Text style={{color:'#FFF'}}>저장</Text></TouchableOpacity>
                        <TouchableOpacity onPress={()=>setModalVisible(false)} style={{padding:10, alignItems:'center', marginTop:5}}><Text style={{color:theme.subText}}>취소</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const GPACalculatorModal = ({ visible, onClose, onSave, theme }) => {
    const [subjects, setSubjects] = useState([{ id: 1, name: '', unit: '', rank: '', tied: '', total: '' }]);
    const [system, setSystem] = useState(9); 
    const [result, setResult] = useState(null);
    const [saveModal, setSaveModal] = useState(false);
    const addSubject = () => setSubjects([...subjects, { id: Date.now(), name: '', unit: '', rank: '', tied: '', total: '' }]);
    const removeSubject = (id) => setSubjects(subjects.filter(s => s.id !== id));
    
    const calculate = () => {
      let totalUnit = 0;
      let totalWeightedGrade = 0;
      const calculated = subjects.map(s => {
        const rank = parseFloat(s.rank) || 0;
        const tied = parseFloat(s.tied) || 0;
        const total = parseFloat(s.total) || 1;
        const unit = parseFloat(s.unit) || 0;
        if (rank === 0 || total === 0) return null;
        const percentage = (rank + (tied > 1 ? tied - 1 : 0)) / total * 100;
        let grade = 9;
        if (system === 9) {
          if (percentage <= 4) grade = 1;
          else if (percentage <= 11) grade = 2;
          else if (percentage <= 23) grade = 3;
          else if (percentage <= 40) grade = 4;
          else if (percentage <= 60) grade = 5;
          else if (percentage <= 77) grade = 6;
          else if (percentage <= 89) grade = 7;
          else if (percentage <= 96) grade = 8;
        } else {
          if (percentage <= 10) grade = 1;
          else if (percentage <= 34) grade = 2;
          else if (percentage <= 66) grade = 3;
          else if (percentage <= 90) grade = 4;
          else grade = 5;
        }
        if (unit > 0) {
          totalUnit += unit;
          totalWeightedGrade += grade * unit;
        }
        return { ...s, grade, percentage: percentage.toFixed(1) };
      });
      const avg = totalUnit > 0 ? (totalWeightedGrade / totalUnit).toFixed(2) : 0;
      setResult({ avg, list: calculated });
    };
  
    const handleSave = (grade, sem) => {
        onSave(grade, sem, result.avg);
        setSaveModal(false);
        onClose();
    };
  
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <SafeAreaView style={{flex:1, backgroundColor: theme.card}}>
          <View style={{padding:16, borderBottomWidth:1, borderColor:theme.border, flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
            <Text style={{fontSize:18, fontWeight:'bold', color: theme.text}}>내신 계산기 🧮</Text>
            <TouchableOpacity onPress={onClose}><Icons.X size={24} color={theme.text}/></TouchableOpacity>
          </View>
          <ScrollView style={{padding:16}}>
             <View style={{flexDirection:'row', justifyContent:'center', marginBottom:20, gap:10}}>
               <TouchableOpacity onPress={()=>setSystem(9)} style={{paddingHorizontal:16, paddingVertical:8, backgroundColor:system===9?theme.primary:theme.inputBg, borderRadius:20}}><Text style={{color:system===9?'#FFF':theme.subText, fontWeight:'bold'}}>9등급제 (현행)</Text></TouchableOpacity>
               <TouchableOpacity onPress={()=>setSystem(5)} style={{paddingHorizontal:16, paddingVertical:8, backgroundColor:system===5?theme.primary:theme.inputBg, borderRadius:20}}><Text style={{color:system===5?'#FFF':theme.subText, fontWeight:'bold'}}>5등급제 (개정)</Text></TouchableOpacity>
             </View>
             {subjects.map((s, i) => (
               <View key={s.id} style={{marginBottom:16, padding:12, backgroundColor:theme.inputBg, borderRadius:12}}>
                 <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom:8}}>
                   <Text style={{fontWeight:'bold', color:theme.text}}>과목 {i+1}</Text>
                   <TouchableOpacity onPress={()=>removeSubject(s.id)}><Icons.Trash2 size={16} color={theme.danger}/></TouchableOpacity>
                 </View>
                 <View style={{flexDirection:'row', gap:8, marginBottom:8}}>
                   <TextInput style={{flex:2, backgroundColor:theme.card, padding:8, borderRadius:8, fontSize:12, color: theme.text}} placeholderTextColor={theme.subText} placeholder="과목명" value={s.name} onChangeText={(t)=>{const n=[...subjects]; n[i].name=t; setSubjects(n)}}/>
                   <TextInput style={{flex:1, backgroundColor:theme.card, padding:8, borderRadius:8, fontSize:12, textAlign:'center', color: theme.text}} placeholderTextColor={theme.subText} placeholder="단위" keyboardType="numeric" value={s.unit} onChangeText={(t)=>{const n=[...subjects]; n[i].unit=t; setSubjects(n)}}/>
                 </View>
                 <View style={{flexDirection:'row', gap:8}}>
                   <TextInput style={{flex:1, backgroundColor:theme.card, padding:8, borderRadius:8, fontSize:12, textAlign:'center', color: theme.text}} placeholderTextColor={theme.subText} placeholder="석차" keyboardType="numeric" value={s.rank} onChangeText={(t)=>{const n=[...subjects]; n[i].rank=t; setSubjects(n)}}/>
                   <TextInput style={{flex:1, backgroundColor:theme.card, padding:8, borderRadius:8, fontSize:12, textAlign:'center', color: theme.text}} placeholderTextColor={theme.subText} placeholder="동석차" keyboardType="numeric" value={s.tied} onChangeText={(t)=>{const n=[...subjects]; n[i].tied=t; setSubjects(n)}}/>
                   <TextInput style={{flex:1, backgroundColor:theme.card, padding:8, borderRadius:8, fontSize:12, textAlign:'center', color: theme.text}} placeholderTextColor={theme.subText} placeholder="이수자" keyboardType="numeric" value={s.total} onChangeText={(t)=>{const n=[...subjects]; n[i].total=t; setSubjects(n)}}/>
                 </View>
                 {result && result.list[i] && (
                   <Text style={{marginTop:8, fontSize:12, color:theme.primary, fontWeight:'bold'}}>
                     👉 {result.list[i].grade}등급 (상위 {result.list[i].percentage}%)
                   </Text>
                 )}
               </View>
             ))}
             <TouchableOpacity onPress={addSubject} style={{alignItems:'center', padding:12, borderWidth:1, borderColor:theme.border, borderStyle:'dashed', borderRadius:12, marginBottom:20}}><Text style={{color:theme.subText}}>+ 과목 추가</Text></TouchableOpacity>
             <TouchableOpacity onPress={calculate} style={{backgroundColor:'#191F28', padding:16, borderRadius:16, alignItems:'center', marginBottom:40}}><Text style={{color:'#FFF', fontWeight:'bold', fontSize:16}}>계산하기</Text></TouchableOpacity>
             {result && (
               <View style={{backgroundColor:theme.inputBg, padding:20, borderRadius:16, alignItems:'center', marginBottom:50}}>
                 <Text style={{fontSize:14, color:theme.subText}}>예상 평균 등급</Text>
                 <Text style={{fontSize:36, fontWeight:'bold', color:theme.primary}}>{result.avg}</Text>
                 <TouchableOpacity onPress={()=>setSaveModal(true)} style={{marginTop:16, backgroundColor:theme.primary, paddingHorizontal:20, paddingVertical:10, borderRadius:20}}><Text style={{color:'#FFF', fontWeight:'bold'}}>성적표에 저장</Text></TouchableOpacity>
               </View>
             )}
          </ScrollView>
          <Modal visible={saveModal} transparent animationType="fade" onRequestClose={()=>setSaveModal(false)}>
              <View style={baseStyles.modalOverlay}>
                  <View style={[baseStyles.modalPopup, { backgroundColor: theme.card }]}>
                      <Text style={{fontSize:18, fontWeight:'bold', marginBottom:16, textAlign:'center', color: theme.text}}>어디에 저장할까요?</Text>
                      <ScrollView style={{maxHeight: 300}}>
                          {[1, 2, 3].map(g => (
                              <View key={g}>
                                  <Text style={{fontSize:14, fontWeight:'bold', color:theme.subText, marginTop:10, marginBottom:5}}>{g}학년</Text>
                                  {['1학기 중간', '1학기 기말', '2학기 중간', '2학기 기말'].map((sem, idx) => (
                                      <TouchableOpacity key={idx} onPress={()=>handleSave(g, idx)} style={{paddingVertical:12, borderBottomWidth:1, borderColor:theme.border}}><Text style={{fontSize:16, color: theme.text}}>{sem}</Text></TouchableOpacity>
                                  ))}
                              </View>
                          ))}
                      </ScrollView>
                      <TouchableOpacity onPress={()=>setSaveModal(false)} style={{alignItems:'center', padding:10, marginTop:10}}><Text style={{color:theme.subText}}>취소</Text></TouchableOpacity>
                  </View>
              </View>
          </Modal>
        </SafeAreaView>
      </Modal>
    );
};

const HomeScreen = ({ settings, schoolData, steps, events, onRefresh, setSettings, theme, setCustomTimetables, customTimetables, weeklyTimetable, setWeeklyTimetable, conditions, setConditions, navigateTo }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [avatarModal, setAvatarModal] = useState(false);
  const [timetableModal, setTimetableModal] = useState(false);
  const [weeklyModalVisible, setWeeklyModalVisible] = useState(false);

  const handleRefresh = async () => { setRefreshing(true); await onRefresh(); setRefreshing(false); };
  
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 11) return "좋은 아침이에요 ☀️";
    if (h >= 11 && h < 17) return "오후도 화이팅! ☕";
    if (h >= 17 && h < 22) return "오늘 하루 고생했어요 🌙";
    return "내일을 위해 충전할 시간 💤";
  }, []);
  const avatars = ["🧑‍🎓", "👩‍🎓", "🐶", "🐱", "🦊", "🐻", "🐼", "🦁", "🐰", "🐸"];

  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const dayOfWeekIndex = getDay(new Date()); 
  const dayKeys = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const todayDayKey = dayKeys[dayOfWeekIndex];

  let displayTimetable = schoolData.timetable;

  if (customTimetables && customTimetables[todayKey]) {
      displayTimetable = customTimetables[todayKey];
  } 
  else if (weeklyTimetable && weeklyTimetable[todayDayKey] && weeklyTimetable[todayDayKey].length > 0) {
      displayTimetable = weeklyTimetable[todayDayKey];
  } else if (schoolData.weeklyTimetable && schoolData.weeklyTimetable[todayDayKey]) {
      displayTimetable = schoolData.weeklyTimetable[todayDayKey];
  }

  const handleSaveTimetable = (newData, isWeekly) => {
      if (isWeekly) {
         setWeeklyTimetable(newData);
         Alert.alert("저장 완료", "이번 주 반복 시간표가 저장되었습니다.");
      } else {
         const newCustom = { ...customTimetables, [todayKey]: newData };
         setCustomTimetables(newCustom);
         Alert.alert("저장 완료", "오늘의 시간표가 수정되었습니다.");
      }
  };

  const handleConditionUpdate = (sleep, focus) => {
      setConditions(prev => ({
          ...prev, 
          [todayKey]: {
              ...(prev[todayKey] || {}), 
              sleep, 
              focus
          }
      }));
  };

  return (
    <ScrollView style={[baseStyles.screen, { backgroundColor: theme.bg }]} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
      <View style={baseStyles.header}>
        <View><Text style={[baseStyles.greeting, { color: theme.text }]}>반가워요, {settings.userName}님 👋</Text><Text style={[baseStyles.subGreeting, { color: theme.subText }]}>{greeting}</Text></View>
        <TouchableOpacity onPress={()=>setAvatarModal(true)} style={[baseStyles.avatar, { backgroundColor: theme.card }]}><Text style={{fontSize: 20}}>{settings.userAvatar || "🧑‍🎓"}</Text></TouchableOpacity>
      </View>
      <DDayBattery name={settings.dDayName} date={settings.dDayDate} theme={theme} />
      
      {settings.showCalendar && <MiniCalendarCard events={events} theme={theme} onNavigate={()=>navigateTo('calendar')} />}
      
      {settings.showTimeTable && (
          <>
            <TimeTableCard 
                timetable={displayTimetable} 
                theme={theme} 
                onEdit={()=>setTimetableModal(true)} 
                onPress={()=>setWeeklyModalVisible(true)}
            />
            <TimetableEditorModal visible={timetableModal} onClose={()=>setTimetableModal(false)} timetable={displayTimetable} onSave={handleSaveTimetable} theme={theme} />
            <WeeklyTimetableViewer visible={weeklyModalVisible} onClose={()=>setWeeklyModalVisible(false)} weeklyTimetable={schoolData.weeklyTimetable || weeklyTimetable} todayTimetable={schoolData.timetable} theme={theme} />
          </>
      )}

      {settings.showMeal && (
        <View style={[baseStyles.card, { backgroundColor: theme.card }]}>
          <View style={baseStyles.cardTitleRow}>
            <View style={{flexDirection:'row', alignItems:'center'}}><Icons.Utensils size={20} color={theme.primary} style={{marginRight: 8}}/><Text style={[baseStyles.cardTitle, { color: theme.text }]}>오늘의 급식</Text></View>
          </View>
          <Text style={{color: theme.subText, lineHeight: 22}}>{schoolData.meal}</Text>
        </View>
      )}

      {settings.showCondition && (
          <BioCondition 
            steps={steps} 
            theme={theme} 
            onUpdateCondition={handleConditionUpdate} 
            initialValues={conditions[todayKey]} 
          />
      )}
      
      <Modal visible={avatarModal} transparent animationType="fade" onRequestClose={()=>setAvatarModal(false)}>
        <TouchableWithoutFeedback onPress={() => setAvatarModal(false)}><View style={baseStyles.modalOverlay} /></TouchableWithoutFeedback>
        <View style={[baseStyles.modalPopup, {alignSelf:'center', top:'20%', position:'absolute', backgroundColor: theme.card}]}>
           <Text style={{fontSize:18, fontWeight:'bold', marginBottom:16, textAlign:'center', color: theme.text}}>아바타 선택</Text>
           <View style={{flexDirection:'row', flexWrap:'wrap', justifyContent:'center', gap:10}}>
             {avatars.map(a => (
               <TouchableOpacity key={a} onPress={() => { setSettings({...settings, userAvatar: a}); setAvatarModal(false); }} style={{width:50, height:50, borderRadius:25, backgroundColor:theme.inputBg, justifyContent:'center', alignItems:'center'}}>
                 <Text style={{fontSize:24}}>{a}</Text>
               </TouchableOpacity>
             ))}
           </View>
        </View>
      </Modal>
      <View style={{height: 100}} /> 
    </ScrollView>
  );
};

// 수정됨: CalendarScreen에 settings prop 추가 및 조건부 렌더링 적용
const CalendarScreen = ({ todos, events, setEvents, theme, conditions, settings }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [modalVisible, setModalVisible] = useState(false);
    const [newEventTitle, setNewEventTitle] = useState("");
    
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    const daysInMonth = eachDayOfInterval({ start, end });

    // 설정값 기본값 처리 (없을 경우 true로 간주)
    const showLedger = settings.syncLedger ?? true;
    const showCondition = settings.syncCondition ?? true;

    const handleAddEvent = async () => {
      if (newEventTitle.trim()) {
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        const timeMatch = newEventTitle.match(/(\d{1,2}:\d{2})/);
        if (timeMatch) {
            const [h, m] = timeMatch[0].split(':').map(Number);
            const eventTime = new Date(selectedDate); eventTime.setHours(h, m, 0, 0);
            const trigger = new Date(eventTime.getTime() - 10 * 60000);
            if (trigger > new Date()) await Notifications.scheduleNotificationAsync({ content: { title: "일정 알림", body: `${newEventTitle} 시작 10분 전!` }, trigger });
        }
        setEvents(prev => ({ ...prev, [dateKey]: [...(prev[dateKey] || []), { title: newEventTitle, id: Date.now(), time: timeMatch ? timeMatch[0] : null }] }));
        setNewEventTitle("");
        setModalVisible(false);
      }
    };
    
    const handleDeleteEvent = (eventId) => {
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        setEvents(prev => ({
            ...prev,
            [dateKey]: prev[dateKey].filter(e => e.id !== eventId)
        }));
    };

    const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');
    const dayEvents = (events && events[selectedDateKey]) ? events[selectedDateKey] : [];
    const dayCondition = conditions[selectedDateKey];

    return (
      <ScrollView style={[baseStyles.screen, { backgroundColor: theme.bg }]}>
        <View style={baseStyles.header}><Text style={[baseStyles.greeting, { color: theme.text }]}>플래너 📅</Text></View>
        <View style={[baseStyles.card, { backgroundColor: theme.card, paddingBottom: 10 }]}>
          <View style={baseStyles.calHeader}>
            <TouchableOpacity onPress={() => setCurrentDate(subMonths(currentDate, 1))}><Icons.ChevronLeft color={theme.text}/></TouchableOpacity>
            <Text style={{fontSize: 18, fontWeight: 'bold', color: theme.text}}>{format(currentDate, 'yyyy년 M월')}</Text>
            <TouchableOpacity onPress={() => setCurrentDate(addMonths(currentDate, 1))}><Icons.ChevronRight color={theme.text}/></TouchableOpacity>
          </View>
          <View style={baseStyles.calGrid}>
            {['일','월','화','수','목','금','토'].map(d => <View key={d} style={[baseStyles.calDay, {marginBottom: 10}]}><Text style={{color:theme.subText, fontSize:12, fontWeight:'bold'}}>{d}</Text></View>)}
            {daysInMonth.map((date, i) => {
              const dateKey = format(date, 'yyyy-MM-dd');
              const isSelected = isSameDay(date, selectedDate);
              const isCurrentMonth = isSameMonth(date, currentDate);
              const hasEvent = (events && events[dateKey] && events[dateKey].length > 0);
              const cond = conditions[dateKey];
              
              return (
                <TouchableOpacity key={i} style={[baseStyles.calDay, isSelected && {backgroundColor: theme.primary, borderRadius: 12}]} onPress={() => setSelectedDate(date)}>
                  <Text style={[baseStyles.calDayText, !isCurrentMonth && {color: theme.subText, opacity: 0.5}, isSelected && {color: '#FFF', fontWeight:'bold'}, {color: isSelected ? '#FFF' : (isSameMonth(date, currentDate) ? theme.text : theme.subText)}]}>{format(date, 'd')}</Text>
                  
                  <View style={{flexDirection:'column', alignItems:'center', marginTop: 2}}>
                      {hasEvent && !isSelected && <View style={[baseStyles.calEventDot, { backgroundColor: theme.primary, marginBottom: 2 }]} />}
                      {/* 수정됨: 설정에 따라 Time Ledger 표시 여부 결정 */}
                      {showLedger && cond && (cond.study > 0 || cond.waste > 0) && !isSelected && (
                          <View style={{flexDirection:'row', gap:2}}>
                              {cond.study > 0 && <View style={{width:4, height:4, borderRadius:2, backgroundColor: '#3B82F6'}}/>}
                              {cond.waste > 0 && <View style={{width:4, height:4, borderRadius:2, backgroundColor: '#EF4444'}}/>}
                          </View>
                      )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[baseStyles.card, { backgroundColor: theme.card }]}>
          <View style={baseStyles.cardTitleRow}>
            <Text style={[baseStyles.cardTitle, { color: theme.text }]}>{format(selectedDate, 'M월 d일')} 요약</Text>
            <TouchableOpacity onPress={() => setModalVisible(true)}><Icons.Plus size={24} color={theme.primary}/></TouchableOpacity>
          </View>
          
          {/* 수정됨: 설정에 따라 컨디션 및 레저 요약 표시 */}
          {dayCondition && (dayCondition.study > 0 || dayCondition.waste > 0 || dayCondition.sleep || dayCondition.focus) ? (
             <View style={{marginBottom:16, backgroundColor:theme.inputBg, padding:12, borderRadius:12}}>
                 {showLedger && (
                     <>
                         <View style={{flexDirection:'row', justifyContent:'space-around', marginBottom: 8}}>
                            <Text style={{color:'#3B82F6', fontWeight:'bold'}}>🟦 공부 {dayCondition.study || 0}h</Text>
                            <Text style={{color:'#EF4444', fontWeight:'bold'}}>🟥 낭비 {dayCondition.waste || 0}h</Text>
                         </View>
                         {(showCondition) && <View style={{height:1, backgroundColor:theme.border, marginVertical:8}}/>}
                     </>
                 )}
                 {showCondition && (
                     <View style={{flexDirection:'row', justifyContent:'space-around'}}>
                        <Text style={{color:theme.text}}>🌙 수면 {dayCondition.sleep || '-'}h</Text>
                        <Text style={{color:theme.text}}>🧠 집중 {dayCondition.focus || '-'}점</Text>
                     </View>
                 )}
             </View>
          ) : (
            <Text style={{color: theme.subText, marginBottom: 16, textAlign:'center'}}>기록된 활동 내역이 없습니다.</Text>
          )}

          <Text style={[baseStyles.cardTitle, {fontSize: 16, marginBottom: 10, color: theme.text}]}>일정 목록</Text>
          {dayEvents.length === 0 ? <Text style={{color:theme.subText, fontStyle:'italic'}}>일정이 없습니다.</Text> : dayEvents.map(e => (
              <View key={e.id} style={{flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
                  <View style={{flexDirection:'row', alignItems:'center'}}>
                      <View style={{width:4, height:16, backgroundColor: e.time ? theme.danger : theme.primary, marginRight:8, borderRadius:2}}/>
                      {e.time && <View style={{backgroundColor: theme.mode === 'dark' ? '#3F1515' : '#FFE4E6', paddingHorizontal:6, paddingVertical:2, borderRadius:4, marginRight:6}}><Text style={{fontSize:10, color:theme.danger, fontWeight:'bold'}}>{e.time}</Text></View>}
                      <Text style={{fontSize:14, color: theme.text}}>{e.title.replace(e.time || '', '').trim()}</Text>
                  </View>
                  <TouchableOpacity onPress={()=>handleDeleteEvent(e.id)}>
                      <Icons.Trash2 size={16} color={theme.subText}/>
                  </TouchableOpacity>
              </View>
          ))}
          {isSameDay(selectedDate, new Date()) && todos.length > 0 && (
              <>
                  <View style={{height:1, backgroundColor:theme.border, marginVertical:12}}/>
                  <Text style={{fontSize:14, fontWeight:'bold', color:theme.subText, marginBottom:8}}>오늘의 할 일</Text>
                  {todos.map(t => <View key={t.id} style={{flexDirection:'row', alignItems:'center', marginBottom:8, opacity: 0.7}}><Icons.CheckCircle2 size={16} color={t.completed ? theme.primary : theme.border} style={{marginRight:8}}/><Text style={{fontSize:14, color: theme.subText, textDecorationLine: t.completed?'line-through':'none'}}>{t.text}</Text></View>)}
              </>
          )}
        </View>
        <Modal visible={modalVisible} transparent animationType="fade">
          <KeyboardAvoidingView behavior={Platform.OS==="ios"?"padding":"height"} style={baseStyles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => setModalVisible(false)}><View style={baseStyles.modalOverlay} /></TouchableWithoutFeedback>
            <View style={[baseStyles.modalPopup, { backgroundColor: theme.card }]}>
              <Text style={{fontSize:18, fontWeight:'bold', marginBottom:16, color: theme.text}}>일정 추가 ✨</Text>
              <TextInput style={{backgroundColor:theme.inputBg, borderRadius:12, padding:12, marginBottom:16, color: theme.text}} placeholderTextColor={theme.subText} placeholder="내용 (예: 13:00 점심약속)" value={newEventTitle} onChangeText={setNewEventTitle} autoFocus/>
              <View style={{flexDirection:'row', justifyContent:'flex-end', gap:10}}>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={{padding:10}}><Text style={{color:theme.subText}}>취소</Text></TouchableOpacity>
                <TouchableOpacity onPress={handleAddEvent} style={{backgroundColor:theme.primary, padding:10, borderRadius:8}}><Text style={{color:'#FFF', fontWeight:'bold'}}>추가</Text></TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
        <View style={{height: 100}} />
      </ScrollView>
    );
};

// ... FocusScreen and ReviewScreen (기존 로직 유지) ...
const FocusScreen = ({ settings, todos, setTodos, studyLogs, setStudyLogs, theme }) => {
  const [mode, setMode] = useState('stopwatch'); 
  const [isRunning, setIsRunning] = useState(false);
  
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [timerTime, setTimerTime] = useState(0);
  const [examTime, setExamTime] = useState(0);

  const [subject, setSubject] = useState("");
  const [subjectModal, setSubjectModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [inputH, setInputH] = useState("00");
  const [inputM, setInputM] = useState("00");
  const [inputS, setInputS] = useState("00");
  const [examStatus, setExamStatus] = useState("대기중"); 
  const [examModeType, setExamModeType] = useState('real'); 

  const subjectList = settings.subjects || ["국어", "수학", "영어", "한국사", "탐구"];

  const setTimerFromInput = () => { 
      const h = parseInt(inputH, 10) || 0;
      const m = parseInt(inputM, 10) || 0;
      const s = parseInt(inputS, 10) || 0;
      const totalSeconds = h * 3600 + m * 60 + s;
      
      if (totalSeconds > 0) {
          setTimerTime(totalSeconds);
          Alert.alert("타이머 설정", `${h}시간 ${m}분 ${s}초로 설정되었습니다.`);
      } else {
          Alert.alert("오류", "시간을 입력해주세요.");
      }
  }; 

  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        if (mode === 'stopwatch') {
           setStopwatchTime(t => t + 1);
           if (subject && (stopwatchTime + 1) % 60 === 0) setStudyLogs(prev => ({...prev, [subject]: (prev[subject] || 0) + 60}));
        } else if (mode === 'timer') {
           setTimerTime(t => {
               if (t <= 0) { setIsRunning(false); Alert.alert("타이머 종료", "설정한 시간이 끝났습니다!"); return 0; }
               return t - 1;
           });
        } else if (mode === 'exam') {
            if (examModeType === 'real') {
                const now = new Date();
                const currentStr = format(now, 'HH:mm');
                const currentPeriod = EXAM_SCHEDULE.find(p => currentStr >= p.start && currentStr < p.end);
                if(currentPeriod) {
                    setExamStatus(currentPeriod.name);
                } else {
                    setExamStatus("시험 대기중");
                }
            } else {
                setExamTime(t => {
                    if (t <= 0) { setIsRunning(false); Alert.alert("시험 종료", "모의고사가 종료되었습니다."); return 0; }
                    return t - 1;
                });
            }
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, mode, stopwatchTime, timerTime, examTime, subject, examModeType]);

  const handleRecord = () => {
    if (stopwatchTime > 0 && subject) {
      setStudyLogs(prev => ({...prev, [subject]: (prev[subject] || 0) + stopwatchTime}));
      setStopwatchTime(0);
      setIsRunning(false);
      Alert.alert("기록 완료", `${subject} 공부가 기록되었습니다!`);
    } else {
      Alert.alert("오류", "과목을 선택하고 시간을 기록해주세요.");
    }
  };

  const startExam = () => { 
      Alert.alert("모의고사 시작", examModeType === 'real' ? "실제 수능 시간표에 맞춰 진행됩니다." : "타이머가 작동합니다."); 
      if (examModeType === 'sim') setExamTime(80 * 60); 
      setExamStatus("1교시 국어"); 
      setIsRunning(true); 
  };
  const stopExam = () => { setIsRunning(false); setExamTime(0); setExamStatus("시험 중단"); };
  
  const formatTime = (s) => {
    const h = Math.floor(s/3600);
    const m = Math.floor((s%3600)/60);
    const sec = s%60;
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
  };
  const logData = Object.entries(studyLogs).sort((a,b) => b[1]-a[1]);
  const maxTime = Math.max(...Object.values(studyLogs), 1);

  return (
    <ScrollView style={[baseStyles.screen, { backgroundColor: theme.bg }]}>
      <View style={baseStyles.header}>
        <Text style={[baseStyles.greeting, { color: theme.text }]}>집중 모드 🔥</Text>
        {settings.earphoneOnly && <View style={{backgroundColor:'#191F28', paddingHorizontal:10, paddingVertical:4, borderRadius:12}}><Text style={{color:'#4ADE80', fontSize:10}}>🎧 ON</Text></View>}
      </View>

      <View style={[baseStyles.card, { backgroundColor: theme.card }]}>
          <View style={[baseStyles.modeToggleContainer, { backgroundColor: theme.inputBg }]}>
              <TouchableOpacity onPress={()=>setMode('stopwatch')} style={[baseStyles.modeToggleBtn, mode==='stopwatch' && { backgroundColor: theme.card, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2 }]}><Text style={[baseStyles.modeText, { color: mode==='stopwatch' ? theme.text : theme.subText }]}>스톱워치</Text></TouchableOpacity>
              <TouchableOpacity onPress={()=>setMode('timer')} style={[baseStyles.modeToggleBtn, mode==='timer' && { backgroundColor: theme.card, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2 }]}><Text style={[baseStyles.modeText, { color: mode==='timer' ? theme.text : theme.subText }]}>타이머</Text></TouchableOpacity>
              <TouchableOpacity onPress={()=>setMode('exam')} style={[baseStyles.modeToggleBtn, mode==='exam' && { backgroundColor: theme.card, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2 }]}><Text style={[baseStyles.modeText, { color: mode==='exam' ? theme.text : theme.subText }]}>모의고사</Text></TouchableOpacity>
          </View>

          {mode === 'stopwatch' && (
             <View style={baseStyles.focusContainer}>
                <TouchableOpacity onPress={()=>setSubjectModal(true)}>
                    <Text style={{color:theme.text, fontSize:18, marginBottom:10}}>{subject || "과목 선택 ▼"}</Text>
                </TouchableOpacity>
                <Text style={[baseStyles.focusTimer, {color: theme.text, fontSize: 64}]} adjustsFontSizeToFit numberOfLines={1}>
                    {formatTime(stopwatchTime)}
                </Text>
                <View style={{flexDirection:'row', gap:20, alignItems:'center'}}>
                    <TouchableOpacity onPress={()=>setIsRunning(!isRunning)} style={{width: 64, height: 64, borderRadius: 32, backgroundColor: isRunning?theme.danger:theme.primary, justifyContent:'center', alignItems:'center'}}>
                        {isRunning ? <Icons.Pause color="#FFF" fill="#FFF"/> : <Icons.Play color="#FFF" fill="#FFF" style={{marginLeft:4}}/>}
                    </TouchableOpacity>
                </View>
                <View style={{flexDirection:'row', gap:10, marginTop:20}}>
                    <TouchableOpacity onPress={handleRecord} style={{backgroundColor:theme.primary, paddingVertical:8, paddingHorizontal:16, borderRadius:20}}><Text style={{color:'#FFF', fontWeight:'bold'}}>기록</Text></TouchableOpacity>
                    <TouchableOpacity onPress={()=>setStopwatchTime(0)} style={{backgroundColor:'#4B5563', paddingVertical:8, paddingHorizontal:16, borderRadius:20}}><Text style={{color:'#FFF', fontWeight:'bold'}}>초기화</Text></TouchableOpacity>
                </View>
             </View>
          )}

          {mode === 'timer' && (
             <View style={baseStyles.focusContainer}>
                <View style={{flexDirection:'row', alignItems:'center', gap:5, marginBottom:10}}>
                    <TextInput value={inputH} onChangeText={setInputH} keyboardType="number-pad" style={{color:theme.text, fontSize:24, borderBottomWidth:1, borderColor:theme.text, width:40, textAlign:'center'}} maxLength={2}/>
                    <Text style={{color:theme.text}}>:</Text>
                    <TextInput value={inputM} onChangeText={setInputM} keyboardType="number-pad" style={{color:theme.text, fontSize:24, borderBottomWidth:1, borderColor:theme.text, width:40, textAlign:'center'}} maxLength={2}/>
                    <Text style={{color:theme.text}}>:</Text>
                    <TextInput value={inputS} onChangeText={setInputS} keyboardType="number-pad" style={{color:theme.text, fontSize:24, borderBottomWidth:1, borderColor:theme.text, width:40, textAlign:'center'}} maxLength={2}/>
                    <TouchableOpacity onPress={setTimerFromInput} style={{marginLeft:10}}><Icons.RotateCcw color={theme.text} size={16}/></TouchableOpacity>
                </View>
                <Text style={[baseStyles.focusTimer, {color: theme.text, fontSize: 64}]} adjustsFontSizeToFit numberOfLines={1}>
                    {formatTime(timerTime)}
                </Text>
                <TouchableOpacity onPress={()=>setIsRunning(!isRunning)} style={{width: 64, height: 64, borderRadius: 32, backgroundColor: isRunning?theme.danger:theme.primary, justifyContent:'center', alignItems:'center'}}>
                    {isRunning ? <Icons.Pause color="#FFF" fill="#FFF"/> : <Icons.Play color="#FFF" fill="#FFF" style={{marginLeft:4}}/>}
                </TouchableOpacity>
             </View>
          )}

          {mode === 'exam' && (
              <View style={[baseStyles.focusContainer, {backgroundColor:'#2C3545'}]}>
                  <Icons.GraduationCap size={40} color="#FFF"/>
                  <View style={{flexDirection:'row', backgroundColor:'#4B5563', borderRadius:8, marginTop:10}}>
                      <TouchableOpacity onPress={()=>setExamModeType('real')} style={{paddingHorizontal:12, paddingVertical:6, backgroundColor:examModeType==='real'?'#3182F6':'transparent', borderRadius:8}}><Text style={{color:'#FFF'}}>실전</Text></TouchableOpacity>
                      <TouchableOpacity onPress={()=>setExamModeType('sim')} style={{paddingHorizontal:12, paddingVertical:6, backgroundColor:examModeType==='sim'?'#3182F6':'transparent', borderRadius:8}}><Text style={{color:'#FFF'}}>타이머</Text></TouchableOpacity>
                  </View>
                  <Text style={{color:'#FFF', fontSize:20, marginTop:10, fontWeight:'bold'}}>{examStatus}</Text>
                  {examModeType === 'sim' && <Text style={[baseStyles.focusTimer, {fontSize: 64}]} adjustsFontSizeToFit numberOfLines={1}>{formatTime(examTime)}</Text>}
                  
                  <ScrollView style={{maxHeight: 100, width: '100%', marginTop: 10}}>
                      {EXAM_SCHEDULE.map((s, i) => (
                          <View key={s.id} style={{flexDirection:'row', justifyContent:'space-between', paddingVertical:4, borderBottomWidth:1, borderColor:'#444'}}>
                              <Text style={{color: examStatus.includes(s.name) ? theme.primary : '#AAA', fontSize: 12}}>{s.name}</Text>
                              <Text style={{color: '#888', fontSize: 12}}>
                                  {examModeType === 'real' ? `${s.start} ~ ${s.end}` : `${s.duration}분`}
                              </Text>
                          </View>
                      ))}
                  </ScrollView>

                  {!isRunning ? (
                      <TouchableOpacity onPress={startExam} style={{paddingHorizontal:24, paddingVertical:12, borderRadius:24, backgroundColor:theme.primary, marginTop:10}}>
                          <Text style={{color:'#FFF', fontWeight:'bold'}}>{examModeType==='real'?'수능 모드 시작':'타이머 시작'}</Text>
                      </TouchableOpacity>
                  ) : (
                      <TouchableOpacity onPress={stopExam} style={{paddingHorizontal:24, paddingVertical:12, borderRadius:24, backgroundColor:theme.danger, marginTop:10}}>
                          <Text style={{color:'#FFF', fontWeight:'bold'}}>시험 중단</Text>
                      </TouchableOpacity>
                  )}
              </View>
          )}
      </View>

      <View style={[baseStyles.card, { backgroundColor: theme.card }]}>
        <Text style={[baseStyles.cardTitle, { color: theme.text }]}>오늘의 공부 기록 📚</Text>
        {logData.length === 0 ? <Text style={{color:theme.subText, marginTop:10}}>아직 공부 기록이 없습니다.</Text> : (
          <View style={{marginTop:10}}>
             {logData.map(([sub, t]) => (
               <View key={sub} style={{marginBottom:10}}>
                 <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom:4}}>
                   <Text style={{fontSize:12, fontWeight:'bold', color: theme.text}}>{sub}</Text>
                   <Text style={{fontSize:12, color:theme.primary}}>{Math.round(t/60)}분</Text>
                 </View>
                 <View style={{height:8, backgroundColor:theme.inputBg, borderRadius:4}}><View style={{height:'100%', width:`${(t/maxTime)*100}%`, backgroundColor:theme.primary, borderRadius:4}}/></View>
               </View>
             ))}
          </View>
        )}
      </View>

      <View style={[baseStyles.card, { backgroundColor: theme.card }]}>
        <View style={baseStyles.cardTitleRow}>
          <Text style={[baseStyles.cardTitle, { color: theme.text }]}>오늘의 목표 ✅</Text>
          <TouchableOpacity onPress={()=>setIsEditing(!isEditing)}><Icons.Pen size={16} color={isEditing?theme.primary:theme.subText} /></TouchableOpacity>
        </View>
        {todos.map(todo => (
          <View key={todo.id} style={{flexDirection:'row', alignItems:'center', marginBottom:12}}>
            {isEditing && <TouchableOpacity onPress={() => setTodos(todos.filter(t=>t.id!==todo.id))}><Icons.Trash2 size={16} color={theme.danger} style={{marginRight:8}}/></TouchableOpacity>}
            <TouchableOpacity onPress={() => { if(!isEditing) setTodos(todos.map(t=>t.id===todo.id?{...t, completed:!t.completed}:t)); }}>
              <Icons.CheckCircle2 size={20} color={todo.completed?theme.primary:theme.border} style={{marginRight:8}} />
            </TouchableOpacity>
            {isEditing ? <TextInput value={todo.text} onChangeText={(text)=>setTodos(todos.map(t=>t.id===todo.id?{...t, text}:t))} style={{flex:1, backgroundColor:theme.inputBg, padding:4, borderRadius:4, color: theme.text}}/> : <Text style={{fontSize:14, color: todo.completed?theme.subText:theme.text, textDecorationLine: todo.completed?'line-through':'none'}}>{todo.text}</Text>}
          </View>
        ))}
        {isEditing && <TouchableOpacity onPress={() => setTodos([...todos, {id: Date.now(), text: '새 목표', completed: false}])} style={{alignItems:'center', padding:10, borderWidth:1, borderColor:theme.border, borderStyle:'dashed', borderRadius:12}}><Icons.Plus size={20} color={theme.subText}/></TouchableOpacity>}
      </View>
      <Modal visible={subjectModal} transparent animationType="fade">
          <KeyboardAvoidingView behavior={Platform.OS==="ios"?"padding":"height"} style={baseStyles.modalOverlay}>
            <TouchableWithoutFeedback onPress={()=>setSubjectModal(false)}><View style={baseStyles.modalOverlay}/></TouchableWithoutFeedback>
            <View style={[baseStyles.modalPopup, { backgroundColor: theme.card }]}>
                <Text style={{fontSize:18, fontWeight:'bold', marginBottom:16, textAlign:'center', color: theme.text}}>과목 선택</Text>
                {subjectList.map(s => (
                    <TouchableOpacity key={s} onPress={()=>{setSubject(s); setSubjectModal(false);}} style={{paddingVertical:12, borderBottomWidth:1, borderColor:theme.border, alignItems:'center'}}>
                        <Text style={{fontSize:16, color: theme.text}}>{s}</Text>
                    </TouchableOpacity>
                ))}
            </View>
          </KeyboardAvoidingView>
      </Modal>

      <View style={{height: 100}} />
    </ScrollView>
  );
};

const ReviewScreen = ({ settings, ledger, setLedger, grades, setGrades, theme }) => {
    const [plans, setPlans] = useState([]); 
    
    useEffect(() => {
        const loadPlans = async () => {
            const saved = await AsyncStorage.getItem('studyos_plans');
            if(saved) setPlans(JSON.parse(saved));
        };
        loadPlans();
    }, []);

    const updatePlans = async (newPlans) => {
        setPlans(newPlans);
        await AsyncStorage.setItem('studyos_plans', JSON.stringify(newPlans));
    };

    const handleAddPlan = (newPlan) => {
        updatePlans([...plans, newPlan]);
    };

    const handleDeletePlan = (id) => {
        updatePlans(plans.filter(p => p.id !== id));
    };

    const [gradeType, setGradeType] = useState('school'); 
    const [gradeLevel, setGradeLevel] = useState(1);
    const [isEditGrade, setIsEditGrade] = useState(false);
    const [localGrades, setLocalGrades] = useState([]);
    const [calcModal, setCalcModal] = useState(false);

    const toggleBlock = (idx) => {
      const nextState = (ledger[idx] + 1) % 3;
      const newLedger = [...ledger];
      newLedger[idx] = nextState;
      setLedger(newLedger);
    };
    
    const stats = { study: ledger.filter(x=>x===1).length, waste: ledger.filter(x=>x===2).length };
  
    const getGradeData = () => {
      if (gradeType === 'school') {
        const labels = ['1-중', '1-기', '2-중', '2-기'];
        const data = gradeLevel === 1 ? grades.school1 : (gradeLevel === 2 ? grades.school2 : grades.school3);
        return { labels, data };
      } else {
        const labels3 = ['3월', '5월', '6월', '7월', '9월', '10월'];
        const labels12 = ['3월', '6월', '9월', '10월'];
        const data = gradeLevel === 3 ? grades.mock3 : (gradeLevel === 2 ? grades.mock2 : grades.mock1);
        return { labels: gradeLevel === 3 ? labels3 : labels12, data };
      }
    };
  
    const { labels, data: currentData } = getGradeData();
    useEffect(() => { setLocalGrades([...currentData]); }, [gradeType, gradeLevel, isEditGrade]);
  
    const handleLocalChange = (idx, text) => {
      const newG = [...localGrades];
      newG[idx] = text;
      setLocalGrades(newG);
    };
  
    const saveGrades = () => {
      const parsed = localGrades.map(v => parseFloat(v) || 0);
      let newGradesObj = { ...grades };
      if (gradeType === 'school') {
        if (gradeLevel === 1) newGradesObj.school1 = parsed;
        else if (gradeLevel === 2) newGradesObj.school2 = parsed;
        else newGradesObj.school3 = parsed;
      } else {
        if (gradeLevel === 1) newGradesObj.mock1 = parsed;
        else if (gradeLevel === 2) newGradesObj.mock2 = parsed;
        else newGradesObj.mock3 = parsed;
      }
      setGrades(newGradesObj);
      setIsEditGrade(false);
    };
  
    const handleCalcSave = (grade, semIdx, val) => {
        let newGradesObj = { ...grades };
        const parsedVal = parseFloat(val);
        if (grade === 1) newGradesObj.school1[semIdx] = parsedVal;
        else if (grade === 2) newGradesObj.school2[semIdx] = parsedVal;
        else if (grade === 3) newGradesObj.school3[semIdx] = parsedVal;
        setGrades(newGradesObj);
        setGradeLevel(grade);
        setGradeType('school');
    };
    const calcHeight = (g) => g <= 0 ? 2 : Math.max(10, (9.5 - g) * 11);

    return (
      <ScrollView style={[baseStyles.screen, { backgroundColor: theme.bg }]}>
        <View style={baseStyles.header}><Text style={[baseStyles.greeting, { color: theme.text }]}>리포트 📈</Text></View>
        
        <CircularPlanner plans={plans} onAddPlan={handleAddPlan} onDeletePlan={handleDeletePlan} theme={theme} />

        <View style={[baseStyles.card, { backgroundColor: theme.card }]}>
          <View style={baseStyles.cardTitleRow}>
            <Text style={[baseStyles.cardTitle, { color: theme.text }]}>Time Ledger ⏱️</Text>
            <View style={{flexDirection:'row', gap:8}}><Text style={{fontSize:10, color:'#3182F6'}}>🟦 공부 {stats.study}h</Text><Text style={{fontSize:10, color:'#EF4444'}}>🟥 낭비 {stats.waste}h</Text></View>
          </View>
          <View style={{flexDirection:'row', flexWrap:'wrap', gap:4}}>
            {ledger.map((state, i) => (
              <TouchableOpacity key={i} onPress={() => toggleBlock(i)} style={{width:'15%', aspectRatio:1, borderRadius:4, borderWidth:1, borderColor:theme.border, backgroundColor: state===1?'#3182F6':state===2?'#EF4444':theme.card, justifyContent:'center', alignItems:'center'}}>
                <Text style={{fontSize:8, color: state===0?theme.subText:'#FFF', textAlign: 'center'}}>{i}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[baseStyles.card, { backgroundColor: theme.card }]}>
          <View style={baseStyles.cardTitleRow}>
            <Text style={[baseStyles.cardTitle, { color: theme.text }]}>성적 추이 📊</Text>
            <View style={{flexDirection:'row', gap:4}}>
               <TouchableOpacity onPress={()=>setGradeType('school')} style={{padding:4, borderRadius:4, backgroundColor:gradeType==='school'?theme.lightPrimary:'transparent'}}><Text style={{fontSize:12, color: theme.text}}>내신</Text></TouchableOpacity>
               <TouchableOpacity onPress={()=>setGradeType('mock')} style={{padding:4, borderRadius:4, backgroundColor:gradeType==='mock'?theme.lightPrimary:'transparent'}}><Text style={{fontSize:12, color: theme.text}}>모의</Text></TouchableOpacity>
            </View>
          </View>
          <View style={{flexDirection:'row', marginBottom:16, justifyContent:'center', gap:10}}>
               {[1,2,3].map(g => (
                 <TouchableOpacity key={g} onPress={()=>setGradeLevel(g)} style={{paddingHorizontal:12, paddingVertical:6, borderRadius:16, backgroundColor:gradeLevel===g?theme.primary:theme.inputBg}}>
                   <Text style={{color:gradeLevel===g?'#FFF':theme.subText, fontWeight:'bold'}}>{g}학년</Text>
                 </TouchableOpacity>
               ))}
          </View>
          {settings.schoolName.includes('중학교') ? <View style={{height:150, justifyContent:'center', alignItems:'center'}}><Text style={{color:theme.subText}}>🚫 중학교는 지원하지 않습니다.</Text></View> : (
            <>
               <View style={{flexDirection:'row', alignItems:'flex-end', height:150, justifyContent:'space-between', paddingHorizontal:10}}>
                 {isEditGrade ? localGrades.map((g, i) => (
                   <View key={i} style={{alignItems:'center', flex:1}}>
                     <TextInput value={String(g)} onChangeText={(t)=>handleLocalChange(i, t)} keyboardType="decimal-pad" style={{fontSize:12, fontWeight:'bold', borderBottomWidth:1, borderColor:theme.primary, textAlign:'center', width:30, marginBottom:10, color: theme.text}} />
                     <Text style={{fontSize:10, color:theme.subText}}>{labels[i]}</Text>
                   </View>
                 )) : currentData.map((g, i) => (
                   <View key={i} style={{alignItems:'center', flex:1}}>
                     {g > 0 && <Text style={{fontSize:10, fontWeight:'bold', color:theme.primary, marginBottom:4}}>{g}</Text>}
                     <View style={{width:'60%', height: `${calcHeight(g)}%`, backgroundColor: g>0?theme.primary:theme.inputBg, borderTopLeftRadius:4, borderTopRightRadius:4, opacity: g>0?0.5:1}} />
                     <Text style={{fontSize:10, color:theme.subText, marginTop:4}}>{labels[i]}</Text>
                   </View>
                 ))}
               </View>
               <View style={{marginTop:16, alignItems:'flex-end'}}>
                  {isEditGrade ? (
                    <View style={{flexDirection:'row', gap:10}}>
                       <TouchableOpacity onPress={()=>setIsEditGrade(false)}><Text style={{color:theme.subText}}>취소</Text></TouchableOpacity>
                       <TouchableOpacity onPress={saveGrades}><Text style={{color:theme.primary, fontWeight:'bold'}}>저장</Text></TouchableOpacity>
                    </View>
                  ) : <TouchableOpacity onPress={()=>setIsEditGrade(true)}><Icons.Pen size={16} color={theme.subText}/></TouchableOpacity>}
               </View>
            </>
          )}
        </View>

        <TouchableOpacity onPress={()=>setCalcModal(true)} style={[baseStyles.card, {flexDirection:'row', alignItems:'center', justifyContent:'center', gap:10, paddingVertical:20, backgroundColor: theme.card}]}>
           <Icons.Calculator size={24} color={theme.primary}/>
           <Text style={{fontSize:16, fontWeight:'bold', color:theme.text}}>내신 등급 계산기 열기</Text>
        </TouchableOpacity>
        <GPACalculatorModal visible={calcModal} onClose={()=>setCalcModal(false)} onSave={handleCalcSave} theme={theme} />
        <View style={{height: 100}} />
      </ScrollView>
    );
};

// 수정됨: 설정 화면에 '기타 설정' 섹션 추가 (연동 관련)
const SettingsScreen = ({ settings, setSettings, theme }) => {
    const [schoolModal, setSchoolModal] = useState(false);
    const [gradeModal, setGradeModal] = useState(false);
    const [subjectModal, setSubjectModal] = useState(false); 
    const [searchQuery, setSearchQuery] = useState("");
    const [schoolList, setSchoolList] = useState([]);
    const [newSubject, setNewSubject] = useState("");
    
    const searchSchool = async () => { setSchoolList(await fetchSchoolList(searchQuery)); };
    const selectSchool = (school) => { setSettings({ ...settings, schoolName: school.SCHUL_NM }); setSchoolModal(false); };
    
    const addSubject = () => {
        if(newSubject.trim()) {
            setSettings(prev => ({...prev, subjects: [...(prev.subjects || ["국어", "수학", "영어", "한국사", "탐구"]), newSubject.trim()]}));
            setNewSubject("");
        }
    };
    
    const removeSubject = (subj) => {
        setSettings(prev => ({...prev, subjects: prev.subjects.filter(s => s !== subj)}));
    };
  
    const subjectList = settings.subjects || ["국어", "수학", "영어", "한국사", "탐구"];
  
    return (
      <ScrollView style={[baseStyles.screen, { backgroundColor: theme.bg }]}>
        <View style={baseStyles.header}><Text style={[baseStyles.greeting, { color: theme.text }]}>설정 ⚙️</Text></View>
        <View style={[baseStyles.card, { backgroundColor: theme.card }]}>
          <Text style={[baseStyles.cardTitle, { color: theme.text }]}>내 정보 📝</Text>
          <TextInput value={settings.userName} onChangeText={(t)=>setSettings({...settings, userName: t})} style={{backgroundColor:theme.inputBg, padding:12, borderRadius:8, marginTop:12, color: theme.text}} placeholder="이름" placeholderTextColor={theme.subText}/>
          <TouchableOpacity onPress={() => setSchoolModal(true)} style={{backgroundColor:theme.inputBg, padding:12, borderRadius:8, marginTop:12, flexDirection:'row', justifyContent:'space-between'}}>
            <Text style={{color: settings.schoolName ? theme.text : theme.subText}}>{settings.schoolName || "학교 검색"}</Text>
            <Icons.Search size={20} color={theme.subText}/>
          </TouchableOpacity>
          <View style={{flexDirection:'row', marginTop:12, gap:10}}>
            <TouchableOpacity onPress={() => setGradeModal(true)} style={{flex:1, backgroundColor:theme.inputBg, borderRadius:8, justifyContent:'center', alignItems:'center', padding:12}}>
              <Text style={{fontSize:16, fontWeight:'bold', color:theme.text}}>{settings.grade}학년</Text>
            </TouchableOpacity>
            <TextInput value={settings.classNum} onChangeText={(t)=>setSettings({...settings, classNum: t})} style={{flex:1, backgroundColor:theme.inputBg, padding:12, borderRadius:8, color: theme.text}} placeholder="반" placeholderTextColor={theme.subText}/>
          </View>
        </View>
        
         <View style={[baseStyles.card, { backgroundColor: theme.card }]}>
          <View style={baseStyles.cardTitleRow}>
              <Text style={[baseStyles.cardTitle, { color: theme.text }]}>과목 관리 📚</Text>
              <TouchableOpacity onPress={()=>setSubjectModal(true)}><Icons.Pen size={18} color={theme.subText}/></TouchableOpacity>
          </View>
          <View style={{flexDirection:'row', flexWrap:'wrap', gap:8}}>
              {subjectList.map(s => (
                  <View key={s} style={{backgroundColor:theme.inputBg, paddingHorizontal:12, paddingVertical:6, borderRadius:16}}>
                      <Text style={{color:theme.text}}>{s}</Text>
                  </View>
              ))}
          </View>
      </View>

      <View style={[baseStyles.card, { backgroundColor: theme.card }]}>
        <Text style={[baseStyles.cardTitle, { color: theme.text }]}>테마 설정 🎨</Text>
        <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:12}}>
            <Text style={{fontWeight:'bold', color: theme.text}}>화면 모드</Text>
            <View style={{flexDirection:'row', backgroundColor:theme.inputBg, borderRadius:8, padding:2}}>
                <TouchableOpacity onPress={()=>setSettings({...settings, themeMode: 'light'})} style={{paddingHorizontal:12, paddingVertical:6, backgroundColor: settings.themeMode !== 'dark' ? theme.card : 'transparent', borderRadius:6}}><Text style={{color: theme.text}}>라이트</Text></TouchableOpacity>
                <TouchableOpacity onPress={()=>setSettings({...settings, themeMode: 'dark'})} style={{paddingHorizontal:12, paddingVertical:6, backgroundColor: settings.themeMode === 'dark' ? '#333' : 'transparent', borderRadius:6}}><Text style={{color: theme.text}}>다크</Text></TouchableOpacity>
            </View>
        </View>
        <View style={{paddingVertical:12}}>
            <Text style={{fontWeight:'bold', color: theme.text, marginBottom:10}}>강조 색상</Text>
            <View style={{flexDirection:'row', flexWrap:'wrap', gap:10}}>
                {Object.keys(COLORS).map(k => (
                    <TouchableOpacity key={k} onPress={()=>setSettings({...settings, primaryColor: k})} style={{width:30, height:30, borderRadius:15, backgroundColor:COLORS[k], borderWidth: settings.primaryColor === k ? 2 : 0, borderColor: theme.text}} />
                ))}
            </View>
        </View>
      </View>

       <View style={[baseStyles.card, { backgroundColor: theme.card }]}>
        <Text style={[baseStyles.cardTitle, { color: theme.text }]}>홈 화면 설정 🛠️</Text>
        {[{ key: 'showCalendar', label: '오늘의 일정', sub: '캘린더 연동' }, { key: 'showTimeTable', label: '시간표', sub: 'NEIS 시간표' }, { key: 'showMeal', label: '급식', sub: '오늘의 메뉴' }, { key: 'showCondition', label: '컨디션', sub: '수면/활동' }].map(item => (
          <View key={item.key} style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:12}}>
            <View><Text style={{fontWeight:'bold', color:theme.text}}>{item.label}</Text><Text style={{fontSize:12, color:theme.subText}}>{item.sub}</Text></View>
            <TouchableOpacity onPress={()=>setSettings({...settings, [item.key]: !settings[item.key]})} style={{width:48, height:28, borderRadius:14, backgroundColor: settings[item.key]?theme.primary:theme.inputBg, justifyContent:'center', paddingHorizontal:2}}>
              <View style={{width:24, height:24, borderRadius:12, backgroundColor:'#FFF', alignSelf: settings[item.key]?'flex-end':'flex-start'}} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* 수정됨: 기타 설정 추가 (연동 관련 토글) */}
      <View style={[baseStyles.card, { backgroundColor: theme.card }]}>
        <Text style={[baseStyles.cardTitle, { color: theme.text }]}>기타 설정 ⚙️</Text>
        {[
            { key: 'syncSchedule', label: '학사일정 연동', sub: '캘린더에 학사일정 표시' },
            { key: 'syncLedger', label: '캘린더 Time Ledger 연동', sub: '캘린더에 공부/낭비 시간 표시' },
            { key: 'syncCondition', label: '캘린더 컨디션 연동', sub: '캘린더 하단에 수면/집중 표시' },
            { key: 'earphoneOnly', label: '이어폰 모드', sub: '연결 시만 알림' }
        ].map(item => (
          <View key={item.key} style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:12}}>
            <View><Text style={{fontWeight:'bold', color:theme.text}}>{item.label}</Text><Text style={{fontSize:12, color:theme.subText}}>{item.sub}</Text></View>
            <TouchableOpacity onPress={()=>setSettings({...settings, [item.key]: settings[item.key] === undefined ? true : !settings[item.key]})} style={{width:48, height:28, borderRadius:14, backgroundColor: (settings[item.key] ?? true)?theme.primary:theme.inputBg, justifyContent:'center', paddingHorizontal:2}}>
              <View style={{width:24, height:24, borderRadius:12, backgroundColor:'#FFF', alignSelf: (settings[item.key] ?? true)?'flex-end':'flex-start'}} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={[baseStyles.card, { backgroundColor: theme.card }]}>
          <Text style={[baseStyles.cardTitle, { color: theme.text }]}>D-Day 설정 🎯</Text>
          <TextInput value={settings.dDayName} onChangeText={(t)=>setSettings({...settings, dDayName: t})} style={{backgroundColor:theme.inputBg, padding:12, borderRadius:8, marginTop:12, color: theme.text}} placeholder="목표 이름" placeholderTextColor={theme.subText}/>
          <TextInput value={settings.dDayDate} onChangeText={(t)=>setSettings({...settings, dDayDate: t})} style={{backgroundColor:theme.inputBg, padding:12, borderRadius:8, marginTop:12, color: theme.text}} placeholder="YYYY-MM-DD" placeholderTextColor={theme.subText}/>
      </View>
      
      {/* ... (모달들은 기존과 동일) ... */}
      <Modal visible={subjectModal} transparent animationType="fade">
          <KeyboardAvoidingView behavior={Platform.OS==="ios"?"padding":"height"} style={baseStyles.modalOverlay}>
            <TouchableWithoutFeedback onPress={()=>setSubjectModal(false)}><View style={baseStyles.modalOverlay}/></TouchableWithoutFeedback>
            <View style={[baseStyles.modalPopup, { backgroundColor: theme.card }]}>
                <Text style={{fontSize:18, fontWeight:'bold', marginBottom:16, textAlign:'center', color: theme.text}}>과목 목록 편집</Text>
                <View style={{flexDirection:'row', marginBottom:16}}>
                    <TextInput value={newSubject} onChangeText={setNewSubject} style={{flex:1, backgroundColor:theme.inputBg, padding:10, borderRadius:8, marginRight:8, color: theme.text}} placeholder="새 과목 입력" placeholderTextColor={theme.subText}/>
                    <TouchableOpacity onPress={addSubject} style={{backgroundColor:theme.primary, padding:10, borderRadius:8, justifyContent:'center'}}><Icons.Plus color="#FFF" size={20}/></TouchableOpacity>
                </View>
                <ScrollView style={{maxHeight:200}}>
                    {subjectList.map(s => (
                        <View key={s} style={{flexDirection:'row', justifyContent:'space-between', paddingVertical:12, borderBottomWidth:1, borderColor:theme.border}}>
                            <Text style={{fontSize:16, color: theme.text}}>{s}</Text>
                            <TouchableOpacity onPress={()=>removeSubject(s)}><Icons.Trash2 size={18} color={theme.danger}/></TouchableOpacity>
                        </View>
                    ))}
                </ScrollView>
                <TouchableOpacity onPress={()=>setSubjectModal(false)} style={{alignItems:'center', padding:10, marginTop:10}}><Text style={{color:theme.subText}}>닫기</Text></TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
      </Modal>

      <Modal visible={schoolModal} transparent animationType="fade">
            <TouchableWithoutFeedback onPress={() => setSchoolModal(false)}><View style={baseStyles.modalOverlay} /></TouchableWithoutFeedback>
            <View style={[baseStyles.modalPopup, {alignSelf:'center', position:'absolute', top:'20%', backgroundColor: theme.card}]}>
              <View style={{flexDirection:'row', alignItems:'center', backgroundColor:theme.inputBg, borderRadius:8, paddingHorizontal:10, marginBottom:10}}>
                  <TextInput value={searchQuery} onChangeText={setSearchQuery} onSubmitEditing={searchSchool} style={{flex:1, paddingVertical:10, color: theme.text}} placeholder="학교명 입력" placeholderTextColor={theme.subText} autoFocus/>
                  <TouchableOpacity onPress={searchSchool}><Icons.Search color={theme.primary}/></TouchableOpacity>
              </View>
              <FlatList data={schoolList} keyExtractor={(item) => item.SD_SCHUL_CODE} renderItem={({item}) => (
                  <TouchableOpacity onPress={() => selectSchool(item)} style={{paddingVertical:12, borderBottomWidth:1, borderColor:theme.border}}><Text style={{fontSize:16, color: theme.text}}>{item.SCHUL_NM}</Text><Text style={{fontSize:12, color:theme.subText}}>{item.ORG_RDNMA}</Text></TouchableOpacity>
              )} style={{maxHeight: 200}}/>
            </View>
      </Modal>
      <Modal visible={gradeModal} transparent animationType="fade">
          <TouchableWithoutFeedback onPress={() => setGradeModal(false)}><View style={baseStyles.modalOverlay} /></TouchableWithoutFeedback>
          <View style={[baseStyles.modalPopup, {alignSelf:'center', position:'absolute', top:'30%', backgroundColor: theme.card}]}>
              {[1, 2, 3].map(g => (
                  <TouchableOpacity key={g} onPress={() => { setSettings({...settings, grade: String(g)}); setGradeModal(false); }} style={{paddingVertical:16, borderBottomWidth:1, borderColor:theme.border, alignItems:'center'}}>
                  <Text style={{fontSize:18, fontWeight: settings.grade === String(g) ? 'bold' : 'normal', color: settings.grade === String(g) ? theme.primary : theme.text}}>{g}학년</Text>
                  </TouchableOpacity>
              ))}
          </View>
      </Modal>
      <View style={{height: 100}} />
      </ScrollView>
    );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [isReady, setIsReady] = useState(false);
  const [settings, setSettings] = useState({
    earphoneOnly: false, showMeal: true, showTimeTable: true, showCondition: true, showCalendar: true, 
    syncSchedule: true, syncLedger: true, syncCondition: true, // 초기값 추가
    userName: '학생', schoolName: '대치고등학교', grade: '2', classNum: '5', dDayName: '2026 수능', dDayDate: '2026-11-19',
    userAvatar: "🧑‍🎓", subjects: ["국어", "수학", "영어", "한국사", "탐구"],
    themeMode: 'light', primaryColor: 'mint'
  });
  const [todos, setTodos] = useState([
    { id: 1, text: "수학 수1 문제집 20p~25p", completed: true },
    { id: 2, text: "영어 영단어 50개 암기", completed: false },
  ]);
  const [events, setEvents] = useState({});
  const [ledger, setLedger] = useState(Array(24).fill(0));
  const [grades, setGrades] = useState({
    school1: [3.5, 3.2, 0, 0], school2: [0, 0, 0, 0], school3: [0, 0, 0, 0],
    mock1: [0, 0, 0, 0], mock2: [0, 0, 0, 0], mock3: [0, 0, 0, 0, 0, 0]
  });
  const [studyLogs, setStudyLogs] = useState({});
  const [customTimetables, setCustomTimetables] = useState({});
  const [weeklyTimetable, setWeeklyTimetable] = useState({}); 
  const [schoolData, setSchoolData] = useState({ meal: "로딩중...", timetable: null, schedule: [] });
  const [steps, setSteps] = useState(0);
  const [conditions, setConditions] = useState({});

  const theme = useMemo(() => getTheme(settings.themeMode, settings.primaryColor), [settings.themeMode, settings.primaryColor]);

  // Persistence Load
  useEffect(() => {
    const load = async () => {
      try {
        const keys = ['settings', 'todos', 'events', 'ledger', 'grades', 'studyLogs', 'customTimetables', 'weeklyTimetable', 'lastDate', 'conditions'];
        const stores = await AsyncStorage.multiGet(keys.map(k => `studyos_${k}`));
        const data = {};
        stores.forEach(([k, v]) => { if(v) data[k.replace('studyos_', '')] = JSON.parse(v); });

        if (data.settings) setSettings(data.settings);
        if (data.events) setEvents(data.events);
        if (data.ledger) setLedger(data.ledger);
        if (data.grades) setGrades(data.grades); 
        if (data.studyLogs) setStudyLogs(data.studyLogs);
        if (data.customTimetables) setCustomTimetables(data.customTimetables);
        if (data.weeklyTimetable) setWeeklyTimetable(data.weeklyTimetable);
        if (data.conditions) setConditions(data.conditions);

        const todayKey = format(new Date(), 'yyyy-MM-dd');
        if (data.lastDate !== todayKey) {
            setTodos([]);
            AsyncStorage.setItem('studyos_lastDate', JSON.stringify(todayKey));
            setLedger(Array(24).fill(0));
        } else if (data.todos) setTodos(data.todos);
        
        setIsReady(true); 
      } catch (e) {
          setIsReady(true);
      }
    };
    load();
  }, []);

  // Persistence Save
  useEffect(() => { if(isReady) AsyncStorage.setItem('studyos_settings', JSON.stringify(settings)); }, [settings, isReady]);
  useEffect(() => { if(isReady) AsyncStorage.setItem('studyos_todos', JSON.stringify(todos)); }, [todos, isReady]);
  useEffect(() => { if(isReady) AsyncStorage.setItem('studyos_events', JSON.stringify(events)); }, [events, isReady]);
  useEffect(() => { if(isReady) AsyncStorage.setItem('studyos_ledger', JSON.stringify(ledger)); }, [ledger, isReady]);
  useEffect(() => { if(isReady) AsyncStorage.setItem('studyos_grades', JSON.stringify(grades)); }, [grades, isReady]);
  useEffect(() => { if(isReady) AsyncStorage.setItem('studyos_studyLogs', JSON.stringify(studyLogs)); }, [studyLogs, isReady]);
  useEffect(() => { if(isReady) AsyncStorage.setItem('studyos_customTimetables', JSON.stringify(customTimetables)); }, [customTimetables, isReady]);
  useEffect(() => { if(isReady) AsyncStorage.setItem('studyos_weeklyTimetable', JSON.stringify(weeklyTimetable)); }, [weeklyTimetable, isReady]);
  useEffect(() => { if(isReady) AsyncStorage.setItem('studyos_conditions', JSON.stringify(conditions)); }, [conditions, isReady]);

  // Daily Ledger Sync
  useEffect(() => {
     if(isReady) {
         const todayKey = format(new Date(), 'yyyy-MM-dd');
         const stats = { study: ledger.filter(x=>x===1).length, waste: ledger.filter(x=>x===2).length };
         setConditions(prev => ({
             ...prev,
             [todayKey]: {
                 ...(prev[todayKey] || {}),
                 study: stats.study,
                 waste: stats.waste
             }
         }));
     }
  }, [ledger, isReady]);

  const fetchData = async () => {
    const data = await fetchSchoolDataWithCache(settings.schoolName, settings.grade, settings.classNum);
    setSchoolData(data);
    if(data.schedule && data.schedule.length > 0 && settings.syncSchedule) {
        const newEvents = { ...events };
        let changed = false;
        data.schedule.forEach(ev => {
            const dateKey = format(new Date(ev.date.substring(0,4), ev.date.substring(4,6)-1, ev.date.substring(6,8)), 'yyyy-MM-dd');
            if (!newEvents[dateKey]) newEvents[dateKey] = [];
            if (!newEvents[dateKey].some(e => e.title === `🏫 ${ev.title}`)) {
                newEvents[dateKey].push({ id: `school_${ev.id}`, title: `🏫 ${ev.title}` });
                changed = true;
            }
        });
        if(changed) setEvents(newEvents);
    }
  };
  useEffect(() => { if(isReady) fetchData(); }, [settings.schoolName, settings.grade, settings.classNum, settings.syncSchedule, isReady]);

  useEffect(() => {
    (async () => {
        await Calendar.requestCalendarPermissionsAsync();
        await Notifications.requestPermissionsAsync();
        const { status: pedoStatus } = await Pedometer.requestPermissionsAsync();
        if (pedoStatus === 'granted') Pedometer.watchStepCount(result => setSteps(result.steps));
    })();
  }, []);

  if (!isReady) return null; 

  const renderScreen = () => {
    switch(activeTab) {
      case 'home': 
          return <HomeScreen 
                   settings={settings} schoolData={schoolData} events={events} steps={steps} onRefresh={fetchData} 
                   setSettings={setSettings} theme={theme} customTimetables={customTimetables} 
                   setCustomTimetables={setCustomTimetables} weeklyTimetable={weeklyTimetable} 
                   setWeeklyTimetable={setWeeklyTimetable} conditions={conditions} setConditions={setConditions}
                   navigateTo={setActiveTab}
                 />;
      // 수정됨: CalendarScreen에 settings prop 전달
      case 'calendar': return <CalendarScreen todos={todos} events={events} setEvents={setEvents} theme={theme} conditions={conditions} settings={settings} />;
      case 'focus': return <FocusScreen settings={settings} todos={todos} setTodos={setTodos} studyLogs={studyLogs} setStudyLogs={setStudyLogs} theme={theme} />;
      case 'review': return <ReviewScreen settings={settings} ledger={ledger} setLedger={setLedger} grades={grades} setGrades={setGrades} theme={theme} />;
      case 'settings': return <SettingsScreen settings={settings} setSettings={setSettings} theme={theme} />;
      default: return <HomeScreen settings={settings} schoolData={schoolData} events={events} steps={steps} onRefresh={fetchData} theme={theme} />;
    }
  };

  return (
    <SafeAreaView style={[baseStyles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={settings.themeMode === 'dark' ? "light-content" : "dark-content"} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={baseStyles.content}>{renderScreen()}</View>
      </KeyboardAvoidingView>
      <View style={[baseStyles.tabBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        {[{ id: 'home', icon: Icons.Home, label: '홈' }, { id: 'calendar', icon: Icons.Calendar, label: '플래너' }, { id: 'focus', icon: Icons.Timer, label: '포커스' }, { id: 'review', icon: Icons.Chart, label: '리포트' }, { id: 'settings', icon: Icons.Settings, label: '설정' }].map((item) => (
          <TouchableOpacity key={item.id} onPress={() => setActiveTab(item.id)} style={baseStyles.tabItem}>
            <item.icon size={24} color={activeTab === item.id ? theme.primary : '#B0B8C1'} />
            <Text style={[baseStyles.tabLabel, { color: activeTab === item.id ? theme.primary : '#B0B8C1' }]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}