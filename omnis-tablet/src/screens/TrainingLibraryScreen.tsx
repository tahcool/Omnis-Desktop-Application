import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function TrainingLibraryScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: 0, paddingBottom: 0 }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      {/* Header */}
      <LinearGradient
        colors={['#4c110d', '#8b2219', '#6b1a14']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.navBar, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.navLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.menuIcon}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Training Library</Text>
        </View>
      </LinearGradient>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>1 course(s) available</Text>

        <View style={styles.coursesGrid}>
          {/* Course Card */}
          <View style={styles.card}>
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <Text style={styles.brandText}>WIRTGEN / KLEEMANN</Text>
            <TouchableOpacity>
              <Ionicons name="trash-outline" size={16} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Card Body */}
          <View style={styles.cardBody}>
            <Text style={styles.courseTitle}>MC 110 Z EVO Retooling</Text>
            <Text style={styles.courseSubtitle}>Distance Plates and Toggle Plate Replacement</Text>

            <View style={styles.badgesRow}>
              <View style={styles.badgeOrange}>
                <Text style={styles.badgeOrangeText}>Intermediate</Text>
              </View>
              <View style={styles.badgeDark}>
                <Text style={styles.badgeDarkText}>45 min</Text>
              </View>
            </View>

            <Text style={styles.description}>
              Learn how to correctly perform retooling tasks on the Kleemann MC 110 Z EVO jaw crusher. Covers changing distance plates and the toggle plate, following all safety protocols.
            </Text>

            <View style={styles.tagsRow}>
              <View style={styles.tag}><Text style={styles.tagText}>Jaw Crusher</Text></View>
              <View style={styles.tag}><Text style={styles.tagText}>Retooling</Text></View>
              <View style={styles.tag}><Text style={styles.tagText}>Maintenance</Text></View>
              <View style={styles.tag}><Text style={styles.tagText}>Safety</Text></View>
            </View>

            {/* Progress */}
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressText}>Progress</Text>
                <Text style={styles.progressTextBlue}>0 / 11 steps</Text>
              </View>
              <View style={styles.progressBarBg}>
                <LinearGradient colors={['#7c3aed', '#5b21b6']} style={[styles.progressBarFill, { width: '5%' }]} start={{x:0, y:0}} end={{x:1, y:0}} />
              </View>
              <TouchableOpacity style={styles.startButton}>
                <Text style={styles.startButtonText}>Start Course</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  navBar: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    marginRight: 16,
  },
  navTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  scrollContent: {
    padding: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 20,
    width: '100%',
  },
  coursesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    width: '32%',
    marginBottom: 16,
  },
  cardHeader: {
    backgroundColor: '#1e293b',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  brandText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cardBody: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  courseTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  courseSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 12,
  },
  badgesRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  badgeOrange: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: '#f59e0b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  badgeOrangeText: {
    color: '#fcd34d',
    fontSize: 9,
    fontWeight: '800',
  },
  badgeDark: {
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  badgeDarkText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  description: {
    color: '#cbd5e1',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 16,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  tag: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '700',
  },
  progressContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '700',
  },
  progressTextBlue: {
    color: '#7c3aed',
    fontSize: 11,
    fontWeight: '800',
  },
  progressBarBg: {
    backgroundColor: '#f1f5f9',
    height: 4,
    borderRadius: 99,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 99,
  },
  startButton: {
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
