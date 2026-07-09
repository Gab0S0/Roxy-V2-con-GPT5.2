import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 6) {
    return 'Todavía es de noche. No hay prisa.';
  }

  if (hour < 12) {
    return 'Buen día. Empecemos con calma.';
  }

  if (hour < 19) {
    return 'Buenas tardes. Podemos empezar por una sola cosa.';
  }

  return 'Buenas noches. Descansa un momento.';
}

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
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.hero}>
              <View style={styles.welcomeText}>
                <Text style={styles.kicker}>Me alegra verte otra vez</Text>
                <Text style={styles.title}>{getGreeting()}</Text>
                <Text style={styles.subtitle}>
                  Estoy aquí. Miremos qué sigue, sin intentar resolverlo todo
                  de una vez.
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={openRoxyChat}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={24}
                color="#FFFFFF"
              />
              <Text style={styles.primaryButtonText}>Hablar con Roxy</Text>
            </TouchableOpacity>

            <View style={styles.secondaryActions}>
              <TouchableOpacity
                style={styles.secondaryAction}
                onPress={() => router.push('/agenda')}
              >
                <Ionicons name="calendar-outline" size={21} color="#F4D7FF" />
                <Text style={styles.secondaryActionText}>Ver Agenda</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryAction}
                onPress={() => router.push('/alarmas')}
              >
                <Ionicons name="alarm-outline" size={21} color="#F4D7FF" />
                <Text style={styles.secondaryActionText}>Alarmas</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryAction}
                onPress={() => router.push('/settings')}
              >
                <Ionicons name="settings-outline" size={21} color="#F4D7FF" />
                <Text style={styles.secondaryActionText}>Ajustes</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: '#090714',
    flex: 1,
  },
  overlay: {
    backgroundColor: 'rgba(5, 3, 15, 0.58)',
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    flexGrow: 1,
    justifyContent: 'flex-end',
    maxWidth: 520,
    padding: 22,
    paddingBottom: 42,
    paddingTop: 44,
    width: '100%',
  },
  hero: {
    alignItems: 'center',
    marginBottom: 34,
  },
  welcomeText: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowColor: '#090714',
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  kicker: {
    color: '#C4B5FD',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 8,
    textShadowColor: 'rgba(5, 3, 15, 0.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 31,
    fontWeight: '800',
    lineHeight: 37,
    textAlign: 'center',
    textShadowColor: 'rgba(5, 3, 15, 0.95)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  subtitle: {
    color: '#F4D7FF',
    fontSize: 15,
    lineHeight: 23,
    marginTop: 14,
    maxWidth: 360,
    textAlign: 'center',
    textShadowColor: 'rgba(5, 3, 15, 0.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(192, 38, 211, 0.76)',
    borderColor: 'rgba(240, 171, 252, 0.24)',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginTop: 0,
    minHeight: 60,
    shadowColor: '#C026D3',
    shadowOpacity: 0.14,
    shadowRadius: 14,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  secondaryAction: {
    alignItems: 'center',
    backgroundColor: 'rgba(22, 16, 34, 0.54)',
    borderColor: 'rgba(244, 215, 255, 0.14)',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    justifyContent: 'center',
    minHeight: 72,
  },
  secondaryActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
