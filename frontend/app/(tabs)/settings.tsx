import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [vibrationEnabled, setVibrationEnabled] = React.useState(true);

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
