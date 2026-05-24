import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Image,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  return (
    <ImageBackground
      source={require('../../assets/images/roxy_bg.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container}>
          <View style={styles.hero}>
            <Image
              source={require('../../assets/images/roxy_alarm.jpg')}
              style={styles.roxyImage}
              resizeMode="cover"
            />

            <Text style={styles.title}>Roxy App</Text>

            <Text style={styles.subtitle}>
              Estoy acá, Gabriel. Decime qué necesitás y avanzamos.
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/roxy')}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={24} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Hablar con Roxy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push('/alarmas')}
            >
              <Ionicons name="alarm-outline" size={24} color="#FFFFFF" />
              <Text style={styles.secondaryButtonText}>Programar alarma</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push('/settings')}
            >
              <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
              <Text style={styles.secondaryButtonText}>Ajustes</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#090714',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 3, 15, 0.68)',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: 28,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roxyImage: {
    width: 235,
    height: 235,
    borderRadius: 32,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 120, 210, 0.55)',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 23,
    color: '#F4D7FF',
    textAlign: 'center',
    maxWidth: 320,
  },
  actions: {
    gap: 14,
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: 22,
    backgroundColor: '#C026D3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 54,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '650',
  },
});