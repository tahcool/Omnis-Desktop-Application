import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getSyncQueue, SyncTask, clearCompletedSyncTasks } from '../database/db';

export default function SyncStatusScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState<SyncTask[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadTasks = () => {
    const data = getSyncQueue();
    setTasks(data);
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleSyncAll = async () => {
    const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'failed');
    if (pendingTasks.length === 0) {
      Alert.alert('Info', 'No pending tasks to sync');
      return;
    }

    setIsSyncing(true);
    for (const task of pendingTasks) {
      try {
        const payload = JSON.parse(task.payload);
        
        // Example sync logic (this will be expanded based on task type)
        // if (task.type === 'POST_CUSTOMER') {
        //   TODO: add Supabase sync logic here if needed
        // }
        
        // For now, simulate a successful sync
        console.log('Syncing task', task.id, task.type);
        // updateSyncTaskStatus(task.id!, 'completed');
      } catch (e: any) {
        console.error('Task failed', e);
        // updateSyncTaskStatus(task.id!, 'failed', e.message);
      }
    }
    setIsSyncing(false);
    loadTasks();
    Alert.alert('Sync Finished', 'Background sync process completed.');
  };

  const handleClearCompleted = () => {
    clearCompletedSyncTasks();
    loadTasks();
  };

  const renderItem = ({ item }: { item: SyncTask }) => (
    <View style={styles.taskCard}>
      <View style={styles.taskHeader}>
        <Text style={styles.taskType}>{item.type}</Text>
        <Text style={[styles.statusBadge, styles[`status_${item.status}` as keyof typeof styles]]}>
          {item.status.toUpperCase()}
        </Text>
      </View>
      <Text style={styles.taskDate}>{new Date(item.created_at).toLocaleString()}</Text>
      <Text style={styles.payloadText} numberOfLines={2}>{item.payload}</Text>
      {item.error_message && (
        <Text style={styles.errorText}>Error: {item.error_message}</Text>
      )}
    </View>
  );

  return (
    <LinearGradient colors={['#ffffff', '#f1f5f9']} style={[styles.container, { paddingTop: 0 }]}>
      <LinearGradient
        colors={['#4c110d', '#8b2219', '#6b1a14']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.navLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.menuIcon}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sync Queue</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.buttonSecondary} onPress={handleClearCompleted}>
            <Text style={styles.buttonTextSecondary}>Clear Completed</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.buttonPrimary, isSyncing && styles.buttonDisabled]} onPress={handleSyncAll} disabled={isSyncing}>
            <Text style={styles.buttonTextPrimary}>{isSyncing ? 'Syncing...' : 'Sync Now'}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>Sync queue is empty.</Text>}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#3a0c09',
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonPrimary: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonSecondary: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonDisabled: {
    backgroundColor: '#93c5fd',
  },
  buttonTextPrimary: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  buttonTextSecondary: {
    color: '#374151',
    fontWeight: 'bold',
  },
  listContent: {
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 40,
    fontSize: 16,
  },
  taskCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  status_pending: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  status_completed: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  status_failed: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
  },
  taskDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 8,
  },
  payloadText: {
    fontSize: 14,
    color: '#4b5563',
    fontFamily: 'monospace',
    backgroundColor: '#f9fafb',
    padding: 8,
    borderRadius: 4,
  },
  errorText: {
    color: '#dc2626',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
});
