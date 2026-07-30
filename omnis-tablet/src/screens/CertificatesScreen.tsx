import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'react-native';

export default function CertificatesScreen({ navigation }: any) {
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
          <Text style={styles.navTitle}>Operator Certificates</Text>
        </View>
      </LinearGradient>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>Generate and print official Machinery Exchange operator certificates.</Text>

        {/* Tabs mock */}
        <View style={styles.tabsContainer}>
          <View style={styles.activeTab}>
            <Ionicons name="add-circle" size={16} color="#0891b2" style={{marginRight:4}} />
            <Text style={styles.activeTabText}>Generate</Text>
          </View>
          <View style={styles.inactiveTab}>
            <Ionicons name="folder" size={16} color="#64748b" style={{marginRight:4}} />
            <Text style={styles.inactiveTabText}>Directory</Text>
          </View>
          <View style={styles.inactiveTab}>
            <Ionicons name="people" size={16} color="#64748b" style={{marginRight:4}} />
            <Text style={styles.inactiveTabText}>Bulk Upload</Text>
          </View>
        </View>

        <View style={styles.mainContent}>
          {/* Left Form */}
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>Certificate Details</Text>

            <Text style={styles.label}>Link to Planned Training (Optional)</Text>
            <View style={styles.selectBox}>
              <Text style={styles.selectText}>-- Type manually below --</Text>
              <Ionicons name="chevron-down" size={20} color="#94a3b8" />
            </View>

            <View style={styles.row}>
              <View style={styles.halfCol}>
                <Text style={styles.label}>Operator Name *</Text>
                <TextInput style={styles.input} placeholder="e.g. John Doe" placeholderTextColor="#cbd5e1" />
              </View>
              <View style={styles.halfCol}>
                <Text style={styles.label}>ID Number *</Text>
                <TextInput style={styles.input} placeholder="e.g. 63-1234567 A 12" placeholderTextColor="#cbd5e1" />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfCol}>
                <Text style={styles.label}>Machine Type *</Text>
                <TextInput style={styles.input} placeholder="e.g. Excavator ZX210" placeholderTextColor="#cbd5e1" />
              </View>
              <View style={styles.halfCol}>
                <Text style={styles.label}>Training Duration</Text>
                <TextInput style={styles.input} placeholder="12 day" placeholderTextColor="#cbd5e1" />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfCol}>
                <Text style={styles.label}>Completion Date *</Text>
                <View style={styles.inputIconWrapper}>
                  <TextInput style={styles.input} placeholder="dd/mm/yyyy" placeholderTextColor="#cbd5e1" />
                  <Ionicons name="calendar-outline" size={20} color="#0f172a" style={styles.inputIcon} />
                </View>
              </View>
              <View style={styles.halfCol}>
                <Text style={styles.label}>Special Mention (Optional)</Text>
                <TextInput style={styles.input} placeholder="e.g. With distinction" placeholderTextColor="#cbd5e1" />
              </View>
            </View>

            <View style={styles.generateButtonContainer}>
              <TouchableOpacity style={styles.generateButton}>
                <Ionicons name="print" size={18} color="#ffffff" style={{marginRight: 8}} />
                <Text style={styles.generateButtonText}>Generate & Print</Text>
              </TouchableOpacity>
            </View>

          </View>

          {/* Right Sidebar */}
          <View style={styles.sidebar}>
            <View style={styles.infoBox}>
              <View style={styles.infoBoxHeader}>
                <Ionicons name="information-circle" size={16} color="#0284c7" style={{marginRight: 6}} />
                <Text style={styles.infoBoxTitle}>Verification QR</Text>
              </View>
              <Text style={styles.infoBoxText}>Certificates generated here will automatically include a secure QR code in the bottom corner.</Text>
              <Text style={styles.infoBoxText}>Anyone can scan this QR code using their phone camera to instantly verify the certificate's authenticity on the machinery-exchange.com/verify.html portal.</Text>
            </View>

            <View style={styles.recentBox}>
              <View style={styles.recentBoxHeader}>
                <Ionicons name="time-outline" size={18} color="#b45309" style={{marginRight: 6}} />
                <Text style={styles.recentBoxTitle}>Recent Certificates</Text>
              </View>

              {[
                { name: 'NYONI', machine: 'Shantui Wheel Loaders', id: '25/06/2026/4359' },
                { name: 'GWINI', machine: 'Shantui Wheel Loaders', id: '25/06/2026/9231' },
                { name: 'MUNENGE', machine: 'Shantui Wheel Loaders', id: '25/06/2026/8436' },
                { name: 'MABHENA', machine: 'Shantui Wheel Loaders', id: '25/06/2026/6180' }
              ].map((cert, idx) => (
                <View key={idx} style={styles.recentItem}>
                  <Text style={styles.recentName}>{cert.name}</Text>
                  <View style={styles.recentDetails}>
                    <Text style={styles.recentMachine}>{cert.machine}</Text>
                    <Text style={styles.recentId}>{cert.id}</Text>
                  </View>
                </View>
              ))}
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
    backgroundColor: '#ffffff',
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
    padding: 24,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 24,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginBottom: 24,
  },
  activeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#0891b2',
  },
  activeTabText: {
    color: '#0891b2',
    fontWeight: '700',
    fontSize: 14,
  },
  inactiveTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  inactiveTabText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 14,
  },
  mainContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },
  formContainer: {
    flex: 2,
    minWidth: 400,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  selectBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 14,
    marginBottom: 20,
  },
  selectText: {
    color: '#64748b',
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  halfCol: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 14,
    fontSize: 14,
    color: '#0f172a',
  },
  inputIconWrapper: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  generateButtonContainer: {
    alignItems: 'flex-end',
    marginTop: 10,
  },
  generateButton: {
    flexDirection: 'row',
    backgroundColor: '#0891b2',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  generateButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  sidebar: {
    flex: 1,
    minWidth: 280,
    gap: 16,
  },
  infoBox: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 12,
    padding: 16,
  },
  infoBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoBoxTitle: {
    color: '#0284c7',
    fontWeight: '800',
    fontSize: 13,
  },
  infoBoxText: {
    color: '#0369a1',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  recentBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    padding: 16,
  },
  recentBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  recentBoxTitle: {
    color: '#b45309',
    fontWeight: '800',
    fontSize: 14,
  },
  recentItem: {
    marginBottom: 16,
  },
  recentName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#78350f',
    marginBottom: 4,
  },
  recentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recentMachine: {
    fontSize: 11,
    color: '#92400e',
    flex: 1,
  },
  recentId: {
    fontSize: 11,
    color: '#92400e',
    fontWeight: '600',
  }
});
