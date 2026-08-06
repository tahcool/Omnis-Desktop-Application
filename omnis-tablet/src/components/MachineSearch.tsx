import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { supabase } from '../api/supabaseClient';
import { Ionicons } from '@expo/vector-icons';

interface MachineSearchProps {
  onSelect: (machine: any) => void;
}

export default function MachineSearch({ onSelect }: MachineSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const searchMachines = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      // Allow searching by sn, name, or customer
      const { data, error } = await supabase
        .from('ft_machine')
        .select('name, sn, model, customer')
        .or(`sn.ilike.%${query}%,name.ilike.%${query}%`)
        .limit(10);
        
      if (!error && data) {
        setResults(data);
      }
      setLoading(false);
    };

    const debounce = setTimeout(() => {
      searchMachines();
    }, 300);

    return () => clearTimeout(debounce);
  }, [query]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Select Machine</Text>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color="#94a3b8" />
        <TextInput
          style={styles.input}
          placeholder="Type Serial Number (e.g. last 4 digits)..."
          placeholderTextColor="#94a3b8"
          value={query}
          onChangeText={setQuery}
        />
        {loading && <ActivityIndicator size="small" color="#8b2219" />}
      </View>

      {results.length > 0 && (
        <View style={styles.resultsContainer}>
          {results.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.resultItem}
              onPress={() => {
                setQuery(item.sn || item.name);
                setResults([]);
                onSelect(item);
              }}
            >
              <Text style={styles.resultTitle}>{item.sn || item.name}</Text>
              <Text style={styles.resultSub}>{item.model} • {item.customer}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16, zIndex: 10 },
  label: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, height: 48 },
  input: { flex: 1, marginLeft: 8, fontSize: 16, color: '#0f172a' },
  resultsContainer: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, marginTop: 4, maxHeight: 200, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 },
  resultItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  resultTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  resultSub: { fontSize: 12, color: '#64748b', marginTop: 2 }
});
