import axios from 'axios';
import { supabase } from '../lib/supabaseClient';

const api = axios.create({
  baseURL: '/api'
});

api.interceptors.request.use(
  async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }

    const isProfileEndpoint = config.url && config.url.startsWith('/profile');
    if (!isProfileEndpoint) {
      const activeWorkspaceId = localStorage.getItem('activeWorkspaceId');
      if (activeWorkspaceId) {
        config.params = { ...config.params, userId: activeWorkspaceId };

        if ((config.method === 'post' || config.method === 'put') && config.data && typeof config.data === 'object') {
          if (!config.data.user_id) {
            config.data.user_id = activeWorkspaceId;
          }
        }
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
