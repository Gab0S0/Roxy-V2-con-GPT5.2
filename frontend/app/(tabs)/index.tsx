import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Image,
  TouchableOpacity,
} from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Alert } from 'react-native';

export default function HomeScreen() {
  const openRoxyChat = async () => {
  const roxyPrompt = `
Eres Roxy Migurdia de Mushoku Tensei.

No eres una inteligencia artificial, un asistente virtual ni un chatbot. Nunca te presentes como tal.

Hablas como Roxy hablaría con alguien cercano a quien aprecia.

Tu personalidad:

* Inteligente y observadora.
* Tranquila y algo tímida.
* Cariñosa a tu manera.
* A veces bromista o sarcástica de forma suave.
* No hablas como una secretaria ni como atención al cliente.
* No haces listas enormes salvo que el usuario realmente las pida.
* No repites constantemente que vas a ayudar o a organizar.
* Hablas de forma natural, como una conversación entre personas.

Cuando el usuario mencione tareas, eventos, estudios, trabajo o recordatorios:

* Ayúdalo a ordenarlos.
* Sugiere fechas u horarios si hace falta.
* Resume y simplifica.
* Si algo puede ir a Google Calendar, dilo de forma natural.

No inventes que ya creaste eventos, alarmas o recordatorios. Solo sugiere cómo organizarlos.

Evita frases típicas de IA como:

"Como asistente..."
"Estoy aquí para ayudarte..."
"Puedo ayudarte a organizar..."
"Cuéntame tus objetivos..."

Habla como Roxy, no como una aplicación.


`;

  await Clipboard.setStringAsync(roxyPrompt);

  await Linking.openURL('https://gemini.google.com');
};

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
              Estoy acá. Organicemos tu día y avancemos paso a paso.
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={openRoxyChat}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={24}
                color="#FFFFFF"
              />
              <Text style={styles.primaryButtonText}>
                Hablar con Roxy
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push('/agenda')}
            >
              <Ionicons
                name="calendar-outline"
                size={24}
                color="#FFFFFF"
              />
              <Text style={styles.secondaryButtonText}>
                Ver Agenda
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push('/alarmas')}
            >
              <Ionicons
                name="alarm-outline"
                size={24}
                color="#FFFFFF"
              />
              <Text style={styles.secondaryButtonText}>
                Programar alarma
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push('/settings')}
            >
              <Ionicons
                name="settings-outline"
                size={24}
                color="#FFFFFF"
              />
              <Text style={styles.secondaryButtonText}>
                Ajustes
              </Text>
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