import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';

const FRAPPE_BASE_URL = 'https://salestrack.powerstar.co.zw'; // Base URL for the production Frappe instance
const SID_KEY = 'frappe_sid';

class FrappeAPI {
  client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: FRAPPE_BASE_URL,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Intercept requests to inject the SID cookie if we have it
    this.client.interceptors.request.use(async (config) => {
      try {
        const sid = await SecureStore.getItemAsync(SID_KEY);
        if (sid) {
          config.headers['Cookie'] = `sid=${sid}`;
        }
      } catch (e) {
        console.error('Error fetching SID from SecureStore', e);
      }
      return config;
    });
  }

  async setBaseUrl(url: string) {
    this.client.defaults.baseURL = url;
  }

  async login(usr: string, pwd: string) {
    try {
      const response = await this.client.post('/api/method/login', {
        usr,
        pwd
      });
      
      const setCookieHeader = response.headers['set-cookie'];
      let sid = '';
      if (setCookieHeader) {
        const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
        for (const cookieStr of cookies) {
          const match = cookieStr.match(/sid=([^;]+)/);
          if (match) {
            sid = match[1];
            break;
          }
        }
      }

      if (sid && sid !== 'Guest') {
        await SecureStore.setItemAsync(SID_KEY, sid);
      }

      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async logout() {
    try {
      await this.client.post('/api/method/logout');
    } catch (e) {
      // Ignore errors on logout
    } finally {
      await SecureStore.deleteItemAsync(SID_KEY);
    }
  }

  async get(resource: string, params?: any) {
    const response = await this.client.get(resource, { params });
    return response.data;
  }

  async post(resource: string, data?: any) {
    const response = await this.client.post(resource, data);
    return response.data;
  }

  async put(resource: string, data?: any) {
    const response = await this.client.put(resource, data);
    return response.data;
  }

  async checkAuth() {
    try {
      const sid = await SecureStore.getItemAsync(SID_KEY);
      if (!sid || sid === 'Guest') return false;

      const response = await this.get('/api/method/frappe.auth.get_logged_user');
      if (response && response.message) {
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
}

export const frappe = new FrappeAPI();
