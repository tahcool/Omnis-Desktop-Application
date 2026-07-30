import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import LoginScreen from './src/screens/LoginScreen';
import ForceResetPasswordScreen from './src/screens/ForceResetPasswordScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import SyncStatusScreen from './src/screens/SyncStatusScreen';
import AddCustomerScreen from './src/screens/AddCustomerScreen';
import OrderTrackingScreen from './src/screens/OrderTrackingScreen';
import CustomerFleetsScreen from './src/screens/CustomerFleetsScreen';
import SalestackCustomersScreen from './src/screens/SalestackCustomersScreen';
import TrainingLibraryScreen from './src/screens/TrainingLibraryScreen';
import CertificatesScreen from './src/screens/CertificatesScreen';
import InboxScreen from './src/screens/InboxScreen';
import LogActivityScreen from './src/screens/LogActivityScreen';
import VisitHistoryScreen from './src/screens/VisitHistoryScreen';
import CustomerEnquiriesScreen from './src/screens/CustomerEnquiriesScreen';
import AfterSalesScreen from './src/screens/AfterSalesScreen';
import { frappe } from './src/api/frappe';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDB } from './src/database/db';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

function DrawerNavigator() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerType: 'front', // Collapsible front drawer
        drawerStyle: {
          width: 280,
        },
      }}
    >
      <Drawer.Screen name="Dashboard" component={DashboardScreen} />
      <Drawer.Screen name="Order Tracking" component={OrderTrackingScreen} />
      <Drawer.Screen name="Customer Fleets" component={CustomerFleetsScreen} />
      <Drawer.Screen name="Salestrack Customers" component={SalestackCustomersScreen} />
      <Drawer.Screen name="Training Library" component={TrainingLibraryScreen} />
      <Drawer.Screen name="Certificates" component={CertificatesScreen} />
      <Drawer.Screen name="Add Customer" component={AddCustomerScreen} />
      <Drawer.Screen name="Sync Status" component={SyncStatusScreen} />
      <Drawer.Screen name="Inbox" component={InboxScreen} />
      <Drawer.Screen name="Log Activity" component={LogActivityScreen} />
      <Drawer.Screen name="Visit History" component={VisitHistoryScreen} />
      <Drawer.Screen name="Customer Enquiries" component={CustomerEnquiriesScreen} />
      <Drawer.Screen name="Aftersales" component={AfterSalesScreen} />
    </Drawer.Navigator>
  );
}

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      // Initialize offline DB
      initDB();

      const loggedIn = await frappe.checkAuth();
      setIsAuthenticated(loggedIn);
      setIsReady(true);
    };
    checkStatus();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            <Stack.Screen name="Login" component={LoginScreen} />
          ) : null}
          <Stack.Screen name="MainApp" component={DrawerNavigator} />
          <Stack.Screen name="ForceResetPassword" component={ForceResetPasswordScreen} />
          {/* We also add Login here in case user logs out */}
          {isAuthenticated ? (
            <Stack.Screen name="Login" component={LoginScreen} />
          ) : null}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
