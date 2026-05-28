import {
  View, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, TextInput, Switch, Image,
} from 'react-native'
import { Text } from '@/components/Text'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp, ImagePlus, X } from 'lucide-react-native'
import { api } from '@/lib/api'
import { useImageUpload } from '@/hooks/useImageUpload'

const GREEN       = '#62a84a'
const GREEN_LIGHT = '#f0fdf4'
const GREEN_BORDER = '#d1f0c8'
const ORANGE      = '#f97316'

interface OptionItem  { name: string; priceAdd: string }
interface GroupItem   { name: string; type: 'SINGLE' | 'MULTIPLE'; required: boolean; options: OptionItem[] }

function emptyGroup(): GroupItem {
  return { name: '', type: 'SINGLE', required: false, options: [{ name: '', priceAdd: '0' }] }
}

export default function ProdutoScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { id } = useLocalSearchParams<{ id?: string }>()
  const isEditing = !!id

  // Campos básicos
  const [name, setName]             = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice]           = useState('')
  const [imageUrl, setImageUrl]     = useState('')
  const [type, setType]             = useState<'PRODUCT' | 'SERVICE'>('PRODUCT')
  const [active, setActive]         = useState(true)

  // Grupos de opções
  const [groups, setGroups]         = useState<GroupItem[]>([])
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set())

  const { pickAndUpload, uploading: imageUploading } = useImageUpload()

  // Carregar produto existente
  const { data: productData, isLoading: loadingProduct } = useQuery<any>({
    queryKey: ['product', id],
    queryFn: () => api.get<any>(`/api/products/${id}`),
    enabled: isEditing,
    staleTime: 0,
  })

  // Preenche campos quando o produto carrega (useEffect evita loop infinito)
  useEffect(() => {
    if (!productData) return
    const data = productData as any
    setName(data.name ?? '')
    setDescription(data.description ?? '')
    setPrice(String(Number(data.price ?? 0)))
    setImageUrl(data.imageUrl ?? '')
    setType(data.type ?? 'PRODUCT')
    setActive(data.active ?? true)
    if (data.optionGroups?.length > 0) {
      setGroups(data.optionGroups.map((g: any) => ({
        name: g.name,
        type: g.type,
        required: g.required ?? false,
        options: g.options.map((o: any) => ({
          name: o.name,
          priceAdd: String(Number(o.priceAdd ?? 0)),
        })),
      })))
    }
  }, [productData])

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      isEditing
        ? api.patch(`/api/products/${id}`, payload)
        : api.post('/api/products', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-products'] })
      queryClient.invalidateQueries({ queryKey: ['product', id] })
      Alert.alert('Sucesso', isEditing ? 'Produto atualizado!' : 'Produto criado!', [
        { text: 'OK', onPress: () => router.back() },
      ])
    },
    onError: (err: any) => {
      Alert.alert('Erro', err?.message ?? 'Não foi possível salvar o produto.')
    },
  })

  function handleSave() {
    if (!name.trim() || name.length < 2) {
      Alert.alert('Atenção', 'Digite o nome do produto (mínimo 2 caracteres).')
      return
    }
    const parsedPrice = parseFloat(price.replace(',', '.'))
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      Alert.alert('Atenção', 'Digite um preço válido.')
      return
    }

    // Validar grupos
    for (const g of groups) {
      if (!g.name.trim()) {
        Alert.alert('Atenção', 'Todos os grupos de opções precisam ter um nome.')
        return
      }
      for (const o of g.options) {
        if (!o.name.trim()) {
          Alert.alert('Atenção', `O grupo "${g.name}" tem opções sem nome.`)
          return
        }
      }
    }

    const payload: any = {
      name: name.trim(),
      description: description.trim() || null,
      price: parsedPrice,
      imageUrl: imageUrl.trim() || null,
      type,
      active,
      optionGroups: groups.map(g => ({
        name: g.name.trim(),
        type: g.type,
        required: g.required,
        minSelect: 0,
        maxSelect: g.type === 'MULTIPLE' ? 10 : 1,
        options: g.options
          .filter(o => o.name.trim())
          .map(o => ({
            name: o.name.trim(),
            priceAdd: parseFloat(o.priceAdd.replace(',', '.')) || 0,
          })),
      })),
    }

    saveMutation.mutate(payload)
  }

  // ── Grupos helpers ──────────────────────────────────────────────────────────

  function addGroup() {
    const idx = groups.length
    setGroups(prev => [...prev, emptyGroup()])
    setExpandedGroups(prev => new Set([...prev, idx]))
  }

  function removeGroup(idx: number) {
    setGroups(prev => prev.filter((_, i) => i !== idx))
  }

  function updateGroup(idx: number, field: keyof GroupItem, value: any) {
    setGroups(prev => prev.map((g, i) => i === idx ? { ...g, [field]: value } : g))
  }

  function addOption(gIdx: number) {
    setGroups(prev => prev.map((g, i) =>
      i === gIdx ? { ...g, options: [...g.options, { name: '', priceAdd: '0' }] } : g
    ))
  }

  function removeOption(gIdx: number, oIdx: number) {
    setGroups(prev => prev.map((g, i) =>
      i === gIdx ? { ...g, options: g.options.filter((_, oi) => oi !== oIdx) } : g
    ))
  }

  function updateOption(gIdx: number, oIdx: number, field: keyof OptionItem, value: string) {
    setGroups(prev => prev.map((g, i) =>
      i === gIdx
        ? { ...g, options: g.options.map((o, oi) => oi === oIdx ? { ...o, [field]: value } : o) }
        : g
    ))
  }

  function toggleExpanded(idx: number) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  if (isEditing && loadingProduct) {
    return (
      <SafeAreaView style={s.centered} edges={['top']}>
        <ActivityIndicator size="large" color={GREEN} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.75}>
          <ArrowLeft size={20} color="#111827" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{isEditing ? 'Editar produto' : 'Novo produto'}</Text>
        <TouchableOpacity
          style={[s.saveBtn, saveMutation.isPending && { opacity: 0.7 }]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.saveBtnText}>Salvar</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Informações básicas ── */}
        <Section title="Informações básicas">
          <Field label="Nome *">
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="Ex: X-Burguer especial"
              placeholderTextColor="#9ca3af"
            />
          </Field>

          <Field label="Preço (R$) *">
            <TextInput
              style={s.input}
              value={price}
              onChangeText={setPrice}
              placeholder="0.00"
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
            />
          </Field>

          <Field label="Descrição">
            <TextInput
              style={[s.input, s.textarea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Descreva o produto..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </Field>

          <Field label="Imagem do produto">
            <View style={s.imageUploadWrap}>
              {imageUrl ? (
                <View style={s.imagePreviewWrap}>
                  <Image source={{ uri: imageUrl }} style={s.imagePreview} resizeMode="cover" />
                  <TouchableOpacity
                    style={s.imageRemoveBtn}
                    onPress={() => setImageUrl('')}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <X size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[s.imagePickerBtn, imageUploading && { opacity: 0.6 }]}
                  onPress={async () => {
                    const url = await pickAndUpload({ folder: 'products', aspect: [1, 1] })
                    if (url) setImageUrl(url)
                  }}
                  disabled={imageUploading}
                  activeOpacity={0.8}
                >
                  {imageUploading
                    ? <ActivityIndicator color={GREEN} size="small" />
                    : <ImagePlus size={24} color={GREEN} />
                  }
                  <Text style={s.imagePickerText}>
                    {imageUploading ? 'Enviando...' : 'Selecionar imagem'}
                  </Text>
                </TouchableOpacity>
              )}
              {imageUrl && (
                <TouchableOpacity
                  style={[s.imageChangeBtn, imageUploading && { opacity: 0.6 }]}
                  onPress={async () => {
                    const url = await pickAndUpload({ folder: 'products', aspect: [1, 1] })
                    if (url) setImageUrl(url)
                  }}
                  disabled={imageUploading}
                  activeOpacity={0.8}
                >
                  {imageUploading
                    ? <ActivityIndicator color={GREEN} size="small" />
                    : <ImagePlus size={14} color={GREEN} />
                  }
                  <Text style={s.imageChangeBtnText}>
                    {imageUploading ? 'Enviando...' : 'Trocar imagem'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </Field>

          {/* Tipo */}
          <Field label="Tipo">
            <View style={s.typeRow}>
              <TouchableOpacity
                style={[s.typeBtn, type === 'PRODUCT' && s.typeBtnActive]}
                onPress={() => setType('PRODUCT')}
                activeOpacity={0.8}
              >
                <Text style={[s.typeBtnText, type === 'PRODUCT' && s.typeBtnTextActive]}>Produto</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.typeBtn, type === 'SERVICE' && s.typeBtnActive]}
                onPress={() => setType('SERVICE')}
                activeOpacity={0.8}
              >
                <Text style={[s.typeBtnText, type === 'SERVICE' && s.typeBtnTextActive]}>Serviço</Text>
              </TouchableOpacity>
            </View>
          </Field>

          {/* Ativo */}
          <View style={s.activeRow}>
            <Text style={s.activeLabel}>Produto ativo (visível no cardápio)</Text>
            <Switch
              value={active}
              onValueChange={setActive}
              trackColor={{ false: '#e5e7eb', true: GREEN_BORDER }}
              thumbColor={active ? GREEN : '#f3f4f6'}
            />
          </View>
        </Section>

        {/* ── Grupos de opções ── */}
        <Section title="Opções e personalizações">
          <Text style={s.sectionHint}>
            Ex: "Tamanho", "Adicionais", "Ponto da carne"
          </Text>

          {groups.map((group, gIdx) => {
            const isExpanded = expandedGroups.has(gIdx)
            return (
              <View key={gIdx} style={s.groupCard}>
                {/* Cabeçalho do grupo */}
                <TouchableOpacity
                  style={s.groupHeader}
                  onPress={() => toggleExpanded(gIdx)}
                  activeOpacity={0.8}
                >
                  <View style={s.groupHeaderLeft}>
                    {isExpanded
                      ? <ChevronUp size={16} color="#6b7280" />
                      : <ChevronDown size={16} color="#6b7280" />
                    }
                    <Text style={s.groupName} numberOfLines={1}>
                      {group.name || `Grupo ${gIdx + 1}`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeGroup(gIdx)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Trash2 size={15} color="#ef4444" />
                  </TouchableOpacity>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={s.groupBody}>
                    {/* Nome do grupo */}
                    <TextInput
                      style={s.input}
                      value={group.name}
                      onChangeText={v => updateGroup(gIdx, 'name', v)}
                      placeholder="Nome do grupo (ex: Tamanho)"
                      placeholderTextColor="#9ca3af"
                    />

                    {/* Tipo do grupo */}
                    <View style={s.typeRow}>
                      <TouchableOpacity
                        style={[s.typeBtn, group.type === 'SINGLE' && s.typeBtnActive]}
                        onPress={() => updateGroup(gIdx, 'type', 'SINGLE')}
                        activeOpacity={0.8}
                      >
                        <Text style={[s.typeBtnText, group.type === 'SINGLE' && s.typeBtnTextActive]}>
                          Escolha única
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.typeBtn, group.type === 'MULTIPLE' && s.typeBtnActive]}
                        onPress={() => updateGroup(gIdx, 'type', 'MULTIPLE')}
                        activeOpacity={0.8}
                      >
                        <Text style={[s.typeBtnText, group.type === 'MULTIPLE' && s.typeBtnTextActive]}>
                          Múltipla escolha
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Obrigatório */}
                    <View style={s.activeRow}>
                      <Text style={s.activeLabel}>Obrigatório</Text>
                      <Switch
                        value={group.required}
                        onValueChange={v => updateGroup(gIdx, 'required', v)}
                        trackColor={{ false: '#e5e7eb', true: GREEN_BORDER }}
                        thumbColor={group.required ? GREEN : '#f3f4f6'}
                      />
                    </View>

                    {/* Opções */}
                    <Text style={s.optionsLabel}>Opções</Text>
                    {group.options.map((opt, oIdx) => (
                      <View key={oIdx} style={s.optionRow}>
                        <TextInput
                          style={[s.input, { flex: 2 }]}
                          value={opt.name}
                          onChangeText={v => updateOption(gIdx, oIdx, 'name', v)}
                          placeholder="Nome da opção"
                          placeholderTextColor="#9ca3af"
                        />
                        <TextInput
                          style={[s.input, { flex: 1 }]}
                          value={opt.priceAdd}
                          onChangeText={v => updateOption(gIdx, oIdx, 'priceAdd', v)}
                          placeholder="+R$"
                          placeholderTextColor="#9ca3af"
                          keyboardType="decimal-pad"
                        />
                        {group.options.length > 1 && (
                          <TouchableOpacity
                            style={s.removeOptionBtn}
                            onPress={() => removeOption(gIdx, oIdx)}
                          >
                            <Trash2 size={14} color="#ef4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}

                    <TouchableOpacity
                      style={s.addOptionBtn}
                      onPress={() => addOption(gIdx)}
                      activeOpacity={0.8}
                    >
                      <Plus size={14} color={GREEN} />
                      <Text style={s.addOptionText}>Adicionar opção</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )
          })}

          <TouchableOpacity style={s.addGroupBtn} onPress={addGroup} activeOpacity={0.85}>
            <Plus size={16} color={GREEN} strokeWidth={2.5} />
            <Text style={s.addGroupText}>Adicionar grupo de opções</Text>
          </TouchableOpacity>
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      {children}
    </View>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#111827' },
  saveBtn: {
    backgroundColor: GREEN, borderRadius: 12,
    paddingHorizontal: 18, paddingVertical: 10,
    minWidth: 72, alignItems: 'center',
  },
  saveBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },

  scroll: { flex: 1 },
  content: { padding: 16, gap: 12 },

  section: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 16, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 4 },
  sectionHint: { fontSize: 12, color: '#9ca3af', marginTop: -8 },

  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },

  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#111827', backgroundColor: '#fafafa',
  },
  textarea: { height: 80, paddingTop: 12 },

  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
    backgroundColor: '#fafafa', alignItems: 'center',
  },
  typeBtnActive: { backgroundColor: GREEN_LIGHT, borderColor: GREEN },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  typeBtnTextActive: { color: GREEN },

  activeRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 4,
  },
  activeLabel: { fontSize: 14, color: '#374151', fontWeight: '500' },

  // Grupos
  groupCard: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, backgroundColor: '#f9fafb',
  },
  groupHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  groupName: { fontSize: 14, fontWeight: '600', color: '#374151', flex: 1 },
  groupBody: { padding: 14, gap: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },

  optionsLabel: { fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  optionRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  removeOptionBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#fef2f2',
    alignItems: 'center', justifyContent: 'center',
  },

  addOptionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8,
  },
  addOptionText: { fontSize: 13, fontWeight: '600', color: GREEN },

  addGroupBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: GREEN, borderStyle: 'dashed',
    borderRadius: 14, paddingVertical: 14,
    backgroundColor: GREEN_LIGHT,
  },
  addGroupText: { fontSize: 14, fontWeight: '700', color: GREEN },

  // Image upload
  imageUploadWrap: { gap: 8 },
  imagePickerBtn: {
    borderWidth: 1.5, borderColor: GREEN, borderStyle: 'dashed',
    borderRadius: 14, paddingVertical: 20,
    alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: GREEN_LIGHT,
  },
  imagePickerText: { fontSize: 14, fontWeight: '600', color: GREEN },
  imagePreviewWrap: { position: 'relative', alignSelf: 'flex-start' },
  imagePreview: { width: 120, height: 120, borderRadius: 14 },
  imageRemoveBtn: {
    position: 'absolute', top: -8, right: -8,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center', justifyContent: 'center',
  },
  imageChangeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 6, paddingHorizontal: 12,
    borderWidth: 1, borderColor: GREEN, borderRadius: 8,
    backgroundColor: GREEN_LIGHT,
  },
  imageChangeBtnText: { fontSize: 13, fontWeight: '600', color: GREEN },
})
