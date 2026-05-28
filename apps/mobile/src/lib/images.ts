// ── Arquivo central de imagens do app ────────────────────────────────────────
// Para trocar uma imagem, substitua o arquivo correspondente na pasta assets/images
// e o app irá refletir a mudança automaticamente.

// ── Telas iniciais (onboarding) ───────────────────────────────────────────────
export const OnboardingImages = {
  slide1: require('../../assets/images/telas-iniciais/slide1.png'),
  slide2: require('../../assets/images/telas-iniciais/slide2.png'),
  slide3: require('../../assets/images/telas-iniciais/slide3.png'),
} as const

// ── Hero da home ──────────────────────────────────────────────────────────────
export const HeroImage = require('../../assets/images/hero-banner.png')

// ── Categorias ────────────────────────────────────────────────────────────────
// Cada chave corresponde à categoria cadastrada no sistema.
// Para trocar: substitua o arquivo PNG na pasta assets/images/categorias/
export const CategoryImages = {
  todas:       require('../../assets/images/categorias/todas.png'),
  restaurante: require('../../assets/images/categorias/restaurante.png'),
  lanchonete:  require('../../assets/images/categorias/lanchonete.png'),
  pizzaria:    require('../../assets/images/categorias/pizzaria.png'),
  mercado:     require('../../assets/images/categorias/mercado.png'),
  farmacia:    require('../../assets/images/categorias/farmacia.png'),
  padaria:     require('../../assets/images/categorias/padaria.png'),
  acai:        require('../../assets/images/categorias/acai.png'),
  sushi:       require('../../assets/images/categorias/sushi.png'),
  bebidas:     require('../../assets/images/categorias/bebidas.png'),
  doceria:     require('../../assets/images/categorias/doceria.png'),
  petshop:     require('../../assets/images/categorias/petshop.png'),
  servicos:    require('../../assets/images/categorias/servicos.png'),
  moda:        require('../../assets/images/categorias/moda.png'),
  eletronicos: require('../../assets/images/categorias/eletronicos.png'),
  hortifruti:  require('../../assets/images/categorias/hortifruti.png'),
  papelaria:   require('../../assets/images/categorias/papelaria.png'),
  brinquedos:  require('../../assets/images/categorias/brinquedos.png'),
} as const

export type CategoryImageKey = keyof typeof CategoryImages
