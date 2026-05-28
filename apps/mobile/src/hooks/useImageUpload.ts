import { useState } from 'react'
import * as ImagePicker from 'expo-image-picker'
import { Alert, Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

interface UploadOptions {
  folder?: string
  aspect?: [number, number]
  quality?: number
}

interface UploadResult {
  url: string
}

export function useImageUpload() {
  const [uploading, setUploading] = useState(false)

  async function pickAndUpload(options: UploadOptions = {}): Promise<string | null> {
    // Solicita permissão apenas em iOS (Android não exige para a galeria)
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(
          'Permissão necessária',
          'Precisamos de acesso à galeria para selecionar imagens.',
        )
        return null
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: options.aspect ?? [1, 1],
      quality: options.quality ?? 0.85,
    })

    if (result.canceled || !result.assets?.length) return null

    const asset = result.assets[0]
    setUploading(true)

    try {
      const token = await SecureStore.getItemAsync('cc_access')

      const formData = new FormData()
      formData.append('file', {
        uri: asset.uri,
        type: asset.mimeType ?? 'image/jpeg',
        name: asset.fileName ?? 'upload.jpg',
      } as never)
      if (options.folder) {
        formData.append('folder', options.folder)
      }

      const response = await fetch(`${BASE_URL}/api/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      })

      const json = await response.json()

      if (!response.ok) {
        throw new Error(json?.error ?? 'Erro ao fazer upload')
      }

      return (json?.data as UploadResult)?.url ?? null
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Não foi possível enviar a imagem'
      Alert.alert('Erro no upload', message)
      return null
    } finally {
      setUploading(false)
    }
  }

  return { pickAndUpload, uploading }
}
