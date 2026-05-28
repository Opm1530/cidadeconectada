/**
 * Wrapper seguro para expo-notifications.
 * expo-notifications não funciona no Expo Go SDK 53+ e lança erro ao ser importado.
 * Verificamos se somos Expo Go ANTES de importar o módulo.
 */
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import { api } from '@/lib/api'

// Verificação síncrona — feita antes de qualquer import dinâmico
const IS_EXPO_GO = Constants.appOwnership === 'expo'

export async function setupNotificationHandler() {
  if (IS_EXPO_GO) return
  try {
    const N = await import('expo-notifications')
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    })
  } catch { /* ignorar */ }
}

export async function registerPushToken() {
  if (IS_EXPO_GO) return
  try {
    const [N, Device] = await Promise.all([
      import('expo-notifications'),
      import('expo-device'),
    ])

    if (!Device.default.isDevice) return

    const { status: existing } = await N.getPermissionsAsync()
    let finalStatus = existing
    if (existing !== 'granted') {
      const { status } = await N.requestPermissionsAsync()
      finalStatus = status
    }
    if (finalStatus !== 'granted') return

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId

    const { data: token } = await N.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    )
    if (!token) return

    await api.put('/api/users/me/push-token', { pushToken: token }).catch(() => {})

    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync('default', {
        name: 'Cidade Conectada',
        importance: N.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#62a84a',
        sound: 'default',
      })
    }
  } catch { /* ignorar */ }
}

export async function addNotificationResponseListener(
  callback: (data: Record<string, unknown>, orderId?: string) => void,
) {
  if (IS_EXPO_GO) return null
  try {
    const N = await import('expo-notifications')
    return N.addNotificationResponseReceivedListener((response) => {
      const data = (response.notification.request.content.data ?? {}) as Record<string, unknown>
      callback(data, data.orderId as string | undefined)
    })
  } catch {
    return null
  }
}

export async function removeNotificationSubscription(sub: unknown) {
  if (IS_EXPO_GO || !sub) return
  try {
    const N = await import('expo-notifications')
    N.removeNotificationSubscription(sub as any)
  } catch { /* ignorar */ }
}
