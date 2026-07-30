import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, ActivityIndicator, Keyboard, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  fetchResults: (query: string) => Promise<string[]>;
  placeholder: string;
  label?: string;
  style?: any;
}

export default function AutocompleteDropdown({ value, onChangeText, fetchResults, placeholder, label, style }: Props) {
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadResults = async (q: string) => {
    setLoading(true);
    try {
      const res = await fetchResults(q);
      setResults(res || []);
    } catch (e) {
      console.error('[AutocompleteDropdown] fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showDropdown) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        loadResults(value);
      }, 300);
    } else {
      setResults([]);
    }
    
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value, showDropdown]);

  const handleSelect = (text: string) => {
    onChangeText(text);
    setShowDropdown(false);
    Keyboard.dismiss();
  };

  const handleBlur = () => {
    setTimeout(() => setShowDropdown(false), 300);
  };

  const isExactMatch = results.some(r => r.toLowerCase().trim() === value.toLowerCase().trim());

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          value={value}
          onChangeText={(txt) => {
            onChangeText(txt);
            if (!showDropdown) setShowDropdown(true);
          }}
          onFocus={() => {
            setShowDropdown(true);
            loadResults(value);
          }}
          onBlur={handleBlur}
        />
        {loading && <ActivityIndicator style={styles.loader} size="small" color="#8b2219" />}
      </View>
      
      {showDropdown && (
        <View style={styles.dropdown}>
          <ScrollView keyboardShouldPersistTaps="always" nestedScrollEnabled style={{ maxHeight: 220 }}>
            {results.length > 0 && (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>EXISTING CUSTOMERS IN SYSTEM</Text>
              </View>
            )}

            {results.map((item, idx) => (
              <TouchableOpacity key={idx} style={styles.dropdownItem} onPress={() => handleSelect(item)}>
                <Ionicons name="business-outline" size={15} color="#475569" style={{ marginRight: 8 }} />
                <Text style={styles.dropdownItemText}>{item}</Text>
              </TouchableOpacity>
            ))}

            {value.trim().length > 0 && !isExactMatch && (
              <TouchableOpacity style={styles.dropdownItemAdd} onPress={() => handleSelect(value.trim())}>
                <Ionicons name="add-circle" size={18} color="#0284c7" style={{ marginRight: 8 }} />
                <Text style={styles.dropdownItemAddText}>+ Add "{value.trim()}" as new customer</Text>
              </TouchableOpacity>
            )}

            {results.length === 0 && !loading && value.trim().length === 0 && (
              <View style={styles.emptyHint}>
                <Text style={styles.emptyHintText}>Start typing customer or company name...</Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    position: 'relative',
    zIndex: 100,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 8,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#ffffff',
    color: '#0f172a',
  },
  loader: {
    position: 'absolute',
    right: 12,
    top: 14,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 9999,
    overflow: 'hidden',
  },
  sectionHeader: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sectionHeaderText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  dropdownItemAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#f0f9ff',
    borderTopWidth: 1,
    borderTopColor: '#e0f2fe',
  },
  dropdownItemAddText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0284c7',
  },
  emptyHint: {
    padding: 14,
    alignItems: 'center',
  },
  emptyHintText: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
});
