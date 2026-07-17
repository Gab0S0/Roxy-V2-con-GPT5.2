import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getUserId } from '../../utils/userId';
import {
  debugRedirectUri,
  getCurrentGoogleAccount,
  getGoogleCalendarConnectionError,
  getGoogleColorSyncEnabled,
  GoogleAccount,
  setGoogleColorSyncEnabled,
  signInWithGoogleCalendar,
  signOutGoogleCalendar,
} from '../../services/googleCalendarService';

export default function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [vibrationEnabled, setVibrationEnabled] = React.useState(true);
  const [userId, setUserId] = useState<string>('Cargando...');
  const [backendUrl, setBackendUrl] = useState<string>('');
  const [googleAccount, setGoogleAccount] = useState<GoogleAccount | null>(null);
  const [googleMessage, setGoogleMessage] = useState('');
  const [syncGoogleColors, setSyncGoogleColors] = useState(true);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const loadDebugInfo = async () => {
    const id = await getUserId();
    setUserId(id);
    setBackendUrl(process.env.EXPO_PUBLIC_BACKEND_URL || 'No configurado');
  };

  const loadGoogleAccount = useCallback(async () => {
    const account = await getCurrentGoogleAccount();
    const connectionError = await getGoogleCalendarConnectionError();
    const colorSyncEnabled = await getGoogleColorSyncEnabled();

    setGoogleAccount(account);
    setGoogleMessage(connectionError ?? '');
    setSyncGoogleColors(colorSyncEnabled);
  }, []);

  const toggleGoogleColorSync = async (enabled: boolean) => {
    setSyncGoogleColors(enabled);
    await setGoogleColorSyncEnabled(enabled);
  };

  useEffect(() => {
    loadDebugInfo();
    loadGoogleAccount();
  }, [loadGoogleAccount]);

  useFocusEffect(
    useCallback(() => {
      loadGoogleAccount();
    }, [loadGoogleAccount])
  );

  const connectGoogleCalendar = async () => {
    setGoogleMessage('');
    setIsGoogleLoading(true);

    try {
      const result = await signInWithGoogleCalendar();

      if (result.status === 'connected') {
        setGoogleAccount(result.account);
        setGoogleMessage('');
        return;
      }

      if (result.status === 'missing_config') {
        setGoogleMessage('Falta configurar Google Client ID en .env');
        return;
      }

      if (result.status === 'cancelled') {
        setGoogleMessage('Conexion cancelada.');
        return;
      }

      if (result.status === 'dismissed') {
        setGoogleMessage('La ventana de Google se cerro antes de terminar.');
        return;
      }

      if (result.status === 'error') {
        setGoogleMessage(result.message);
      }
    } catch (error) {
      console.warn('No se pudo conectar Google Calendar.', error);
      setGoogleMessage('No se pudo conectar Google Calendar.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const disconnectGoogleCalendar = async () => {
    setGoogleMessage('');
    setIsGoogleLoading(true);

    try {
      await signOutGoogleCalendar();
      setGoogleAccount(null);
    } catch (error) {
      console.warn('No se pudo desconectar Google Calendar.', error);
      setGoogleMessage('No se pudo desconectar Google Calendar.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notificaciones</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="notifications-outline" size={24} color="#4A90E2" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Notificaciones</Text>
                <Text style={styles.settingDescription}>
                  Recibir alertas de alarmas
                </Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#3A3A3C', true: '#4A90E2' }}
              thumbColor={notificationsEnabled ? '#FFFFFF' : '#8E8E93'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="volume-high-outline" size={24} color="#4A90E2" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Sonido</Text>
                <Text style={styles.settingDescription}>
                  Reproducir sonido de alarma
                </Text>
              </View>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: '#3A3A3C', true: '#4A90E2' }}
              thumbColor={soundEnabled ? '#FFFFFF' : '#8E8E93'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="phone-portrait-outline" size={24} color="#4A90E2" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Vibración</Text>
                <Text style={styles.settingDescription}>
                  Vibrar al sonar alarma
                </Text>
              </View>
            </View>
            <Switch
              value={vibrationEnabled}
              onValueChange={setVibrationEnabled}
              trackColor={{ false: '#3A3A3C', true: '#4A90E2' }}
              thumbColor={vibrationEnabled ? '#FFFFFF' : '#8E8E93'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Google Calendar</Text>

          <View style={styles.googleCard}>
            <View style={styles.settingInfo}>
              <Ionicons name="calendar-outline" size={24} color="#C026D3" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>
                  {googleAccount
                    ? `Conectado como ${googleAccount.email}`
                    : 'No conectado'}
                </Text>
                <Text style={styles.settingDescription}>
                  Roxy puede leer y guardar eventos en tu calendario principal.
                </Text>
              </View>
            </View>

            {!googleAccount ? (
              <Text style={styles.localEventsNote}>
                Sin Google conectado, los eventos nuevos quedan solo en este
                dispositivo y pueden perderse al borrar datos o desinstalar la app.
              </Text>
            ) : null}

            {googleMessage ? (
              <Text style={styles.googleMessage}>{googleMessage}</Text>
            ) : null}

            <View style={styles.googleColorSyncRow}>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>
                  Sincronizar colores con Google Calendar
                </Text>
                <Text style={styles.settingDescription}>
                  Usa colores de Google para reflejar las categorias de Roxy.
                </Text>
              </View>

              <Switch
                value={syncGoogleColors}
                onValueChange={toggleGoogleColorSync}
                trackColor={{ false: '#3A3A3C', true: '#C026D3' }}
                thumbColor={syncGoogleColors ? '#FFFFFF' : '#8E8E93'}
              />
            </View>

            <TouchableOpacity
              disabled={isGoogleLoading}
              style={[
                styles.googleButton,
                googleAccount && styles.googleDisconnectButton,
                isGoogleLoading && styles.disabledButton,
              ]}
              onPress={
                googleAccount
                  ? disconnectGoogleCalendar
                  : connectGoogleCalendar
              }
            >
              <Ionicons
                name={googleAccount ? 'log-out-outline' : 'logo-google'}
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.googleButtonText}>
                {isGoogleLoading
                  ? 'Procesando...'
                  : googleAccount
                    ? 'Desconectar Google Calendar'
                    : 'Conectar Google Calendar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información de Debug</Text>
          
          <View style={styles.debugCard}>
            <Text style={styles.debugLabel}>User ID:</Text>
            <Text style={styles.debugValue} selectable>{userId}</Text>
          </View>

          <View style={styles.debugCard}>
            <Text style={styles.debugLabel}>Backend URL:</Text>
            <Text style={styles.debugValue} selectable>{backendUrl}</Text>
          </View>

          <View style={styles.debugCard}>
            <Text style={styles.debugLabel}>Redirect URI:</Text>
            <Text style={styles.debugValue} selectable>{debugRedirectUri()}</Text>
          </View>

          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={loadDebugInfo}
          >
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.refreshButtonText}>Actualizar Info</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acerca de</Text>

          <View style={styles.infoCard}>
            <Ionicons name="sparkles" size={48} color="#4A90E2" />
            <Text style={styles.appName}>Roxy</Text>
            <Text style={styles.appVersion}>Versión 1.0.0</Text>
            <Text style={styles.appDescription}>
              Tu asistente personal de alarmas con inteligencia artificial
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Próximas funciones</Text>
          <View style={styles.featureCard}>
            <Ionicons name="calendar-outline" size={24} color="#8E8E93" />
            <Text style={styles.featureText}>
              Integración con Google Calendar
            </Text>
          </View>
          <View style={styles.featureCard}>
            <Ionicons name="mic-outline" size={24} color="#8E8E93" />
            <Text style={styles.featureText}>
              Comandos de voz para Roxy
            </Text>
          </View>
          <View style={styles.featureCard}>
            <Ionicons name="cloud-outline" size={24} color="#8E8E93" />
            <Text style={styles.featureText}>
              Sincronización en la nube
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#8E8E93',
  },
  debugCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  debugLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
    marginBottom: 8,
  },
  debugValue: {
    fontSize: 12,
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  googleCard: {
    backgroundColor: '#1C1C1E',
    borderColor: 'rgba(192, 38, 211, 0.34)',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  googleMessage: {
    color: '#F4D7FF',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
  },
  localEventsNote: {
    color: '#A1A1AA',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 12,
  },
  googleColorSyncRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(9, 7, 20, 0.34)',
    borderColor: 'rgba(240, 171, 252, 0.14)',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 14,
    padding: 12,
  },
  googleButton: {
    alignItems: 'center',
    backgroundColor: '#C026D3',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  googleDisconnectButton: {
    backgroundColor: '#3A3A3C',
    borderColor: 'rgba(244, 215, 255, 0.18)',
    borderWidth: 1,
  },
  disabledButton: {
    opacity: 0.6,
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  refreshButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  infoCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 12,
  },
  appVersion: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  appDescription: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 12,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 12,
  },
});
