import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, ActivityIndicator, Keyboard, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchItemSearchResults, EnquiryItemSearchResult } from '../api/itemApi';

interface Props {
  value: string;
  onSelectItem: (item: EnquiryItemSearchResult) => void;
  onChangeText: (text: string) => void;
  placeholder: string;
  style?: any;
}

export default function ItemAutocompleteDropdown({ value, onSelectItem, onChangeText, placeholder, style }: Props) {
  const [results, setResults] = useState<EnquiryItemSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadResults = async (q: string) => {
    if (!q || q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchItemSearchResults(q);
      setResults(res || []);
    } catch (e) {
      console.error('[ItemAutocompleteDropdown] fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showDropdown && value.trim().length >= 2) {
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

  const handleSelect = (item: EnquiryItemSearchResult) => {
    onSelectItem(item);
    setShowDropdown(false);
    Keyboard.dismiss();
  };

  const handleCustomAdd = () => {
    const trimmed = value.trim();
    onSelectItem({ name: trimmed });
    setShowDropdown(false);
    Keyboard.dismiss();
  };

  const isExactMatch = results.some(r => r.name.toLowerCase().trim() === value.toLowerCase().trim());

  return (
    <View style={[styles.container, style]}>
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
            if (value.length >= 2) loadResults(value);
          }}
          onBlur={() => setTimeout(() => setShowDropdown(false), 300)}
        />
        {loading && <ActivityIndicator style={styles.loader} size="small" color="#8b2219" />}
      </View>

      {showDropdown && value.trim().length >= 2 && (
        <View style={styles.dropdown}>
          <ScrollView keyboardShouldPersistTaps="always" nestedScrollEnabled style={{ maxHeight: 250 }}>
            {results.length > 0 && (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>MATCHING PRODUCTS &amp; QUOTE CATALOG</Text>
              </View>
            )}

            {results.map((item, idx) => {
              const sugStr = item.suggestedPrice ? `$${item.suggestedPrice.toLocaleString()}` : null;
              const lastStr = item.lastQuotedPrice ? `$${item.lastQuotedPrice.toLocaleString()}` : null;

              return (
                <TouchableOpacity key={idx} style={styles.dropdownItem} onPress={() => handleSelect(item)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{item.name}</Text>

                    {(sugStr || lastStr) && (
                      <View style={styles.priceRow}>
                        {sugStr && (
                          <View style={styles.priceBadgeSug}>
                            <Text style={styles.priceBadgeSugText}>Suggested: {sugStr}</Text>
                          </View>
                        )}
                        {lastStr && (
                          <View style={styles.priceBadgeLast}>
                            <Text style={styles.priceBadgeLastText}>
                              Last Quoted: {lastStr} {item.lastQuotedRef ? `(${item.lastQuotedRef})` : ''}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                  {item.company && (
                    <View style={[styles.companyBadge, item.company === 'Sinopower' ? styles.companySino : styles.companyMxg]}>
                      <Text style={styles.companyBadgeText}>{item.company === 'Machinery Exchange' ? 'M/Exchange' : item.company}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            {!isExactMatch && value.trim().length > 0 && (
              <TouchableOpacity style={styles.dropdownItemAdd} onPress={handleCustomAdd}>
                <Ionicons name="add-circle" size={18} color="#0284c7" style={{ marginRight: 8 }} />
                <Text style={styles.dropdownItemAddText}>+ Add "{value.trim()}" as custom item</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    zIndex: 300,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#ffffff',
    color: '#0f172a',
  },
  loader: {
    position: 'absolute',
    right: 10,
    top: 10,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 9999,
    overflow: 'hidden',
  },
  sectionHeader: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sectionHeaderText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  priceBadgeSug: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priceBadgeSugText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803d',
  },
  priceBadgeLast: {
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priceBadgeLastText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7c3aed',
  },
  companyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginLeft: 8,
  },
  companySino: {
    backgroundColor: '#7f1d1d',
  },
  companyMxg: {
    backgroundColor: '#1e3a5f',
  },
  companyBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
  },
  dropdownItemAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f0f9ff',
    borderTopWidth: 1,
    borderTopColor: '#e0f2fe',
  },
  dropdownItemAddText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284c7',
  },
});
