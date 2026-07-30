import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function InboxScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#4c110d" />
      
      {/* Header */}
      <LinearGradient
        colors={['#4c110d', '#8b2219', '#6b1a14']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.navBar}
      >
        <View style={styles.headerTop}>
          <View style={styles.navLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.menuIcon}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.navTitle}>Inbox & Follow-ups</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Main Content */}
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="mail-open-outline" size={64} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No Follow-ups Yet</Text>
          <Text style={styles.emptyText}>
            Quotes and other important items requiring your attention will appear here.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  navBar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3a0c09',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  menuIcon: {
    marginRight: 16,
    padding: 4,
  },
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#334155',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  }
});
