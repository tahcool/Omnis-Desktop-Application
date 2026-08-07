import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

interface NotificationDetailModalProps {
  visible: boolean;
  data: any;
  onClose: () => void;
}

export default function NotificationDetailModal({ visible, data, onClose }: NotificationDetailModalProps) {
  if (!data) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BlurView style={styles.blurContainer} intensity={40} tint="dark">
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="notifications" size={24} color="#f59e0b" />
              <Text style={styles.title}>{data.title || 'Notification Details'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.bodyScroll}>
            <Text style={styles.bodyText}>{data.body}</Text>
            
            <View style={styles.detailsContainer}>
              {data.screen && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Module:</Text>
                  <Text style={styles.detailValue}>{data.screen}</Text>
                </View>
              )}
              {data.record_id && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Record ID:</Text>
                  <Text style={styles.detailValue}>{data.record_id}</Text>
                </View>
              )}
              {data.machine_id && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Machine ID:</Text>
                  <Text style={styles.detailValue}>{data.machine_id}</Text>
                </View>
              )}
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.actionButton} onPress={onClose}>
            <Text style={styles.actionButtonText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '85%',
    maxHeight: '70%',
    backgroundColor: '#1f2937', // dark background for premium feel
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },
  bodyScroll: {
    marginBottom: 20,
  },
  bodyText: {
    fontSize: 16,
    color: '#e5e7eb',
    marginBottom: 20,
    lineHeight: 24,
  },
  detailsContainer: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  detailLabel: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  detailValue: {
    color: '#f3f4f6',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
