import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

const USER_ID_KEY = '@roxy_user_id';

/**
 * Obtiene o genera el userId único por instalación
 * Se genera una sola vez y se guarda en AsyncStorage
 */
export async function getUserId(): Promise<string> {
  try {
    // Intentar obtener userId existente
    let userId = await AsyncStorage.getItem(USER_ID_KEY);
    
    if (!userId) {
      // Generar nuevo userId
      userId = uuid.v4() as string;
      await AsyncStorage.setItem(USER_ID_KEY, userId);
      console.log('✅ Nuevo userId generado:', userId);
    }
    
    return userId;
  } catch (error) {
    console.error('Error obteniendo userId:', error);
    // Fallback: generar temporal
    return uuid.v4() as string;
  }
}
