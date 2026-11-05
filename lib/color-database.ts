/**
 * Color Database - Base Expandida de Cores (~300 cores)
 *
 * Combina:
 * - Cores X11/CSS4 (147 cores padrão web)
 * - Sistema NBS/ISCC (National Bureau of Standards / Inter-Society Color Council)
 * - Nomes em português brasileiro descritivos
 * - Pré-calculados: RGB, Hex, Lab (D65), categoria, sinônimos
 *
 * Para performance: Lab pré-calculado evita conversão em runtime.
 */

import { LabColor, RgbColor, srgbToLab } from './color-science';

export interface ColorEntry {
  /** Nome principal em PT-BR */
  name: string;
  /** Hex padrão (#RRGGBB) */
  hex: string;
  /** RGB 0-255 */
  rgb: RgbColor;
  /** CIELAB pré-calculado (D65) */
  lab: LabColor;
  /** Categoria geral para agrupamento */
  category: ColorCategory;
  /** Sinônimos/nomes alternativos para TTS */
  synonyms: string[];
  /** Descrição perceptual (ex: "vermelho vivo", "azul esverdeado") */
  perceptualDescription: string;
  /** Valor de luminosidade percebida (L* 0-100) */
  lightness: number;
  /** Croma (saturação perceptual) */
  chroma: number;
  /** Matiz em graus (0-360) */
  hue: number;
}

export type ColorCategory =
  | 'vermelho'
  | 'laranja'
  | 'amarelo'
  | 'verde'
  | 'ciano'
  | 'azul'
  | 'roxo'
  | 'rosa'
  | 'marrom'
  | 'cinza'
  | 'preto'
  | 'branco';

// ============================================================================
// Dados Brutos (RGB + Hex + Nome PT-BR + Categoria)
// ============================================================================

// Estrutura: [nome, hex, categoria, sinônimos..., descrição perceptual]
const RAW_COLORS: Array<[
  string,
  string,
  ColorCategory,
  string[],
  string
]> = [
  // ===== VERMELHOS =====
  ['Vermelho', '#FF0000', 'vermelho', ['Vermelho puro', 'Red'], 'vermelho vivo'],
  ['Vermelho Escuro', '#8B0000', 'vermelho', ['Dark Red'], 'vermelho escuro'],
  ['Vermelho Claro', '#FF6B6B', 'vermelho', ['Light Red'], 'vermelho claro'],
  ['Carmim', '#DC143C', 'vermelho', ['Crimson'], 'vermelho carmim'],
  ['Vermelho Sangue', '#880808', 'vermelho', ['Blood Red'], 'vermelho sangue'],
  ['Vermelho Tijolo', '#B22222', 'vermelho', ['Firebrick'], 'vermelho tijolo'],
  ['Vermelho Indiano', '#CD5C5C', 'vermelho', ['Indian Red'], 'vermelho indiano'],
  ['Vermelho Tomate', '#FF6347', 'vermelho', ['Tomato'], 'vermelho tomate'],
  ['Coral', '#FF7F50', 'vermelho', [], 'vermelho coral'],
  ['Salmão', '#FA8072', 'vermelho', ['Salmon'], 'vermelho salmão'],
  ['Salmão Claro', '#FFA07A', 'vermelho', ['Light Salmon'], 'salmão claro'],
  ['Salmão Escuro', '#E9967A', 'vermelho', ['Dark Salmon'], 'salmão escuro'],
  ['Terra de Siena', '#E2725B', 'vermelho', ['Sienna'], 'terra de siena'],
  ['Terracota', '#E2725B', 'vermelho', [], 'terracota'],
  ['Ferrugem', '#B7410E', 'vermelho', ['Rust'], 'ferrugem'],
  ['Borgonha', '#800020', 'vermelho', ['Burgundy'], 'borgonha'],
  ['Borrado', '#900020', 'vermelho', [], 'vermelho borrado'],
  ['Granada', '#8B0000', 'vermelho', ['Garnet'], 'granada'],
  ['Cereja', '#DE3163', 'vermelho', ['Cherry'], 'cereja'],
  ['Framboesa', '#E25098', 'vermelho', ['Raspberry'], 'framboesa'],
  ['Morango', '#FC5A8D', 'vermelho', ['Strawberry'], 'morango'],
  ['Rubi', '#E0115F', 'vermelho', ['Ruby'], 'rubi'],
  ['Escarlate', '#FF2400', 'vermelho', ['Scarlet'], 'escarlate'],
  ['Vermelho Fogo', '#E25822', 'vermelho', ['Fire Engine Red'], 'vermelho fogo'],
  ['Vermelho Ferrari', '#FF2800', 'vermelho', ['Ferrari Red'], 'vermelho ferrari'],

  // ===== LARANJAS =====
  ['Laranja', '#FFA500', 'laranja', ['Orange'], 'laranja puro'],
  ['Laranja Escuro', '#FF8C00', 'laranja', ['Dark Orange'], 'laranja escuro'],
  ['Laranja Claro', '#FFB347', 'laranja', ['Light Orange'], 'laranja claro'],
  ['Laranja Vivo', '#FF6600', 'laranja', ['Vivid Orange'], 'laranja vivo'],
  ['Laranja Queimado', '#CC5500', 'laranja', ['Burnt Orange'], 'laranja queimado'],
  ['Cenoura', '#ED9121', 'laranja', ['Carrot'], 'cenoura'],
  ['Abóbora', '#FF7518', 'laranja', ['Pumpkin'], 'abóbora'],
  ['Tangerina', '#F28500', 'laranja', ['Tangerine'], 'tangerina'],
  ['Damasco', '#FFB878', 'laranja', ['Apricot'], 'damasco'],
  ['Pêssego', '#FFDAB9', 'laranja', ['Peach'], 'pêssego'],
  ['Pêssego Escuro', '#FFCBA4', 'laranja', ['Dark Peach'], 'pêssego escuro'],
  ['Melão', '#FDBCB4', 'laranja', ['Melon'], 'melão'],
  ['Alperce', '#FBCEB1', 'laranja', ['Apricot'], 'alperce'],
  ['Âmbar', '#FFBF00', 'laranja', ['Amber'], 'âmbar'],
  ['Ocre', '#CC7722', 'laranja', ['Ochre'], 'ocre'],
  ['Terracota Claro', '#E66C2C', 'laranja', [], 'terracota claro'],
  ['Bronze', '#CD7F32', 'laranja', [], 'bronze'],
  ['Cobre', '#B87333', 'laranja', ['Copper'], 'cobre'],

  // ===== AMARELOS =====
  ['Amarelo', '#FFFF00', 'amarelo', ['Yellow'], 'amarelo puro'],
  ['Amarelo Canário', '#FFEF00', 'amarelo', ['Canary Yellow'], 'amarelo canário'],
  ['Amarelo Escuro', '#DAA520', 'amarelo', ['Goldenrod', 'Amarelo Escuro'], 'amarelo dourado'],
  ['Amarelo Claro', '#FFFFE0', 'amarelo', ['Light Yellow'], 'amarelo claro'],
  ['Amarelo Limão', '#FFFF00', 'amarelo', ['Lemon Yellow'], 'amarelo limão'],
  ['Amarelo Mostarda', '#FFDB58', 'amarelo', ['Mustard'], 'amarelo mostarda'],
  ['Amarelo Açafrão', '#F4C430', 'amarelo', ['Saffron'], 'amarelo açafrão'],
  ['Amarelo Enxofre', '#FFFF6B', 'amarelo', ['Sulfur Yellow'], 'amarelo enxofre'],
  ['Crema', '#FFFDD0', 'amarelo', ['Cream'], 'crema'],
  ['Bege', '#F5F5DC', 'amarelo', ['Beige'], 'bege'],
  ['Marfim Amarelo', '#FFFFF0', 'amarelo', ['Ivory'], 'marfim amarelado'],
  ['Amarelo Pastel', '#FDFD96', 'amarelo', ['Pastel Yellow'], 'amarelo pastel'],
  ['Amarelo Neôn', '#CCFF00', 'amarelo', ['Neon Yellow'], 'amarelo neôn'],
  ['Dourado', '#FFD700', 'amarelo', ['Golden'], 'dourado'],
  ['Dourado Escuro', '#B8860B', 'amarelo', ['Dark Goldenrod'], 'dourado escuro'],
  ['Amarelo Trigo', '#F5DEB3', 'amarelo', ['Wheat'], 'amarelo trigo'],
  ['Caqui', '#F0E68C', 'amarelo', ['Khaki'], 'caqui'],
  ['Caqui Escuro', '#BDB76B', 'amarelo', ['Dark Khaki'], 'caqui escuro'],

  // ===== VERDES =====
  ['Verde', '#008000', 'verde', ['Green'], 'verde puro'],
  ['Verde Escuro', '#006400', 'verde', ['Dark Green'], 'verde escuro'],
  ['Verde Claro', '#90EE90', 'verde', ['Light Green'], 'verde claro'],
  ['Verde Floresta', '#228B22', 'verde', ['Forest Green'], 'verde floresta'],
  ['Verde Musgo', '#8A9A5B', 'verde', ['Moss Green'], 'verde musgo'],
  ['Verde Oliva', '#808000', 'verde', ['Olive'], 'verde oliva'],
  ['Verde Oliva Escuro', '#556B2F', 'verde', ['Dark Olive Green'], 'verde oliva escuro'],
  ['Verde Limão', '#32CD32', 'verde', ['Lime Green'], 'verde limão'],
  ['Verde Grama', '#7CFC00', 'verde', ['Lawn Green'], 'verde grama'],
  ['Verde Primavera', '#00FF7F', 'verde', ['Spring Green'], 'verde primavera'],
  ['Verde Primavera Médio', '#00FA9A', 'verde', ['Medium Spring Green'], 'verde primavera médio'],
  ['Verde Mar', '#2E8B57', 'verde', ['Sea Green'], 'verde mar'],
  ['Verde Mar Claro', '#20B2AA', 'verde', ['Light Sea Green'], 'verde mar claro'],
  ['Verde Mar Escuro', '#8FBC8F', 'verde', ['Dark Sea Green'], 'verde mar escuro'],
  ['Verde Água', '#66CDAA', 'verde', ['Medium Aquamarine'], 'verde água'],
  ['Verde Esmeralda', '#50C878', 'verde', ['Emerald'], 'verde esmeralda'],
  ['Verde Jade', '#00A86B', 'verde', ['Jade'], 'verde jade'],
  ['Verde Menta', '#98FF98', 'verde', ['Mint Cream'], 'verde menta'],
  ['Verde Menta Médio', '#66FF99', 'verde', ['Medium Mint'], 'verde menta médio'],
  ['Verde Árvore', '#0A6B0A', 'verde', [], 'verde árvore'],
  ['Verde Pinheiro', '#01796F', 'verde', ['Pine Green'], 'verde pinheiro'],
  ['Verde Sálvia', '#9DC183', 'verde', ['Sage'], 'verde sálvia'],
  ['Verde Abacate', '#568203', 'verde', ['Avocado'], 'verde abacate'],
  ['Verde Maçã', '#8DB600', 'verde', ['Apple Green'], 'verde maçã'],
  ['Verde Kelly', '#4CBB17', 'verde', ['Kelly Green'], 'verde kelly'],
  ['Verde Brilhante', '#66FF00', 'verde', ['Bright Green'], 'verde brilhante'],
  ['Verde Neon', '#39FF14', 'verde', ['Neon Green'], 'verde neon'],

  // ===== CIANAS / TEAL =====
  ['Ciano', '#00FFFF', 'ciano', ['Cyan', 'Aqua'], 'ciano puro'],
  ['Ciano Escuro', '#008B8B', 'ciano', ['Dark Cyan'], 'ciano escuro'],
  ['Azul Claro', '#ADD8E6', 'ciano', ['Light Blue'], 'azul claro'],
  ['Turquesa', '#40E0D0', 'ciano', ['Turquoise'], 'turquesa'],
  ['Turquesa Escura', '#00CED1', 'ciano', ['Dark Turquoise'], 'turquesa escura'],
  ['Turquesa Média', '#48D1CC', 'ciano', ['Medium Turquoise'], 'turquesa média'],
  ['Turquesa Pálida', '#AFEEEE', 'ciano', ['Pale Turquoise'], 'turquesa pálida'],
  ['Água Marinha', '#7FFFD4', 'ciano', ['Aquamarine'], 'água marinha'],
  ['Verde Azulado', '#008080', 'ciano', ['Teal'], 'verde azulado (teal)'],
  ['Verde Azulado Escuro', '#005F5F', 'ciano', ['Dark Teal'], 'verde azulado escuro'],
  ['Azul Cadete', '#5F9EA0', 'ciano', ['Cadet Blue'], 'azul cadete'],
  ['Azul Aço Claro', '#B0C4DE', 'ciano', ['Light Steel Blue'], 'azul aço claro'],
  ['Azul Pó', '#B0E0E6', 'ciano', ['Powder Blue'], 'azul pó'],
  ['Azul Céu', '#87CEEB', 'ciano', ['Sky Blue'], 'azul céu'],
  ['Azul Céu Claro', '#87CEFA', 'ciano', ['Light Sky Blue'], 'azul céu claro'],
  ['Azul Céu Profundo', '#00BFFF', 'ciano', ['Deep Sky Blue'], 'azul céu profundo'],
  ['Azul Alice', '#F0F8FF', 'ciano', ['Alice Blue'], 'azul alice'],

  // ===== AZUIS =====
  ['Azul', '#0000FF', 'azul', ['Blue'], 'azul puro'],
  ['Azul Escuro', '#00008B', 'azul', ['Dark Blue'], 'azul escuro'],
  ['Azul Marinho', '#000080', 'azul', ['Navy', 'Midnight Blue'], 'azul marinho'],
  ['Azul Meia-Noite', '#191970', 'azul', ['Midnight Blue'], 'azul meia-noite'],
  ['Azul Real', '#4169E1', 'azul', ['Royal Blue'], 'azul real'],
  ['Azul Cobalto', '#0047AB', 'azul', ['Cobalt Blue'], 'azul cobalto'],
  ['Azul Cobalto Claro', '#6666FF', 'azul', [], 'azul cobalto claro'],
  ['Azul Safira', '#0F52BA', 'azul', ['Sapphire'], 'azul safira'],
  ['Azul Dodger', '#1E90FF', 'azul', ['Dodger Blue'], 'azul dodger'],
  ['Azul Flor de Milho', '#6495ED', 'azul', ['Cornflower Blue'], 'azul flor de milho'],
  ['Azul Ardósia', '#6A5ACD', 'azul', ['Slate Blue'], 'azul ardósia'],
  ['Azul Ardósia Claro', '#7B68EE', 'azul', ['Medium Slate Blue'], 'azul ardósia claro'],
  ['Azul Ardósia Escuro', '#483D8B', 'azul', ['Dark Slate Blue'], 'azul ardósia escuro'],
  ['Azul Aço', '#4682B4', 'azul', ['Steel Blue'], 'azul aço'],
  ['Azul Aço Claro 2', '#B0C4DE', 'azul', ['Light Steel Blue'], 'azul aço claro'],
  ['Azul Céu 2', '#87CEEB', 'azul', ['Sky Blue'], 'azul céu'],
  ['Azul Bebê', '#89CFF0', 'azul', ['Baby Blue'], 'azul bebê'],
  ['Azul Tiffany', '#0ABAB5', 'azul', ['Tiffany Blue'], 'azul tiffany'],
  ['Azul Egípcio', '#1034A6', 'azul', ['Egyptian Blue'], 'azul egípcio'],
  ['Azul Persa', '#1C39BB', 'azul', ['Persian Blue'], 'azul persa'],
  ['Azul Prussiano', '#003153', 'azul', ['Prussian Blue'], 'azul prussiano'],
  ['Índigo', '#4B0082', 'azul', ['Indigo'], 'índigo'],
  ['Azul Elétrico', '#007FFF', 'azul', ['Electric Blue'], 'azul elétrico'],
  ['Azul Neon', '#4D4DFF', 'azul', ['Neon Blue'], 'azul neon'],
  ['Azul Pavão', '#006B8B', 'azul', ['Peacock Blue'], 'azul pavão'],

  // ===== ROXOS / VIOLETAS =====
  ['Roxo', '#800080', 'roxo', ['Purple'], 'roxo puro'],
  ['Roxo Escuro', '#4B0082', 'roxo', ['Dark Purple'], 'roxo escuro'],
  ['Roxo Claro', '#DDA0DD', 'roxo', ['Plum', 'Roxo Claro'], 'roxo claro'],
  ['Roxo Médio', '#9370DB', 'roxo', ['Medium Purple'], 'roxo médio'],
  ['Violeta', '#EE82EE', 'roxo', ['Violet'], 'violeta'],
  ['Violeta Escuro', '#9400D3', 'roxo', ['Dark Violet'], 'violeta escuro'],
  ['Violeta Claro', '#D8BFD8', 'roxo', ['Light Violet'], 'violeta claro'],
  ['Orquídea', '#DA70D6', 'roxo', ['Orchid'], 'orquídea'],
  ['Orquídea Escura', '#9932CC', 'roxo', ['Dark Orchid'], 'orquídea escura'],
  ['Orquídea Média', '#BA55D3', 'roxo', ['Medium Orchid'], 'orquídea média'],
  ['Ameixa', '#DDA0DD', 'roxo', ['Plum'], 'ameixa'],
  ['Ameixa Escura', '#8E4585', 'roxo', [], 'ameixa escura'],
  ['Lilás', '#C8A2C8', 'roxo', ['Lilac', 'Lavender'], 'lilás'],
  ['Lilás Claro', '#E6E6FA', 'roxo', ['Lavender'], 'lilás claro'],
  ['Lilás Escuro', '#9B30FF', 'roxo', [], 'lilás escuro'],
  ['Magenta', '#FF00FF', 'roxo', ['Fuchsia', 'Magenta'], 'magenta'],
  ['Magenta Escuro', '#8B008B', 'roxo', ['Dark Magenta'], 'magenta escuro'],
  ['Púrpura', '#800080', 'roxo', ['Purple'], 'púrpura'],
  ['Púrpura Média', '#9370DB', 'roxo', ['Medium Purple'], 'púrpura média'],
  ['Ametista', '#9966CC', 'roxo', ['Amethyst'], 'ametista'],
  ['Berinjela', '#6C3A6B', 'roxo', ['Eggplant'], 'berinjela'],
  ['Uva', '#6F2DA8', 'roxo', ['Grape'], 'uva'],
  ['Violeta Elétrico', '#8F00FF', 'roxo', ['Electric Violet'], 'violeta elétrico'],
  ['Violeta Neon', '#BC13FE', 'roxo', ['Neon Violet'], 'violeta neon'],

  // ===== ROSAS =====
  ['Rosa', '#FFC0CB', 'rosa', ['Pink'], 'rosa'],
  ['Rosa Claro', '#FFB6C1', 'rosa', ['Light Pink'], 'rosa claro'],
  ['Rosa Quente', '#FF69B4', 'rosa', ['Hot Pink'], 'rosa quente'],
  ['Rosa Profundo', '#FF1493', 'rosa', ['Deep Pink'], 'rosa profundo'],
  ['Rosa Chiclete', '#FF77FF', 'rosa', [], 'rosa chiclete'],
  ['Rosa Bebê', '#F4C2C2', 'rosa', ['Baby Pink'], 'rosa bebê'],
  ['Rosa Antigo', '#C08081', 'rosa', ['Old Rose'], 'rosa antigo'],
  ['Rosa Chá', '#F88379', 'rosa', ['Tea Rose'], 'rosa chá'],
  ['Rosa Quartzo', '#AA98A9', 'rosa', ['Rose Quartz'], 'rosa quartzo'],
  ['Fúcsia', '#FF00FF', 'rosa', ['Fuchsia'], 'fúcsia'],
  ['Rosa Choque', '#FC0FC0', 'rosa', ['Shocking Pink'], 'rosa choque'],
  ['Rosa Coral', '#F88379', 'rosa', ['Coral Pink'], 'rosa coral'],
  ['Rosa Salmão', '#FF91A4', 'rosa', ['Salmon Pink'], 'rosa salmão'],
  ['Rosa Pálido', '#FADADD', 'rosa', ['Pale Pink'], 'rosa pálido'],
  ['Rosa Pastel', '#FFD1DC', 'rosa', ['Pastel Pink'], 'rosa pastel'],

  // ===== MARRONS =====
  ['Marrom', '#A52A2A', 'marrom', ['Brown'], 'marrom'],
  ['Marrom Escuro', '#654321', 'marrom', ['Dark Brown'], 'marrom escuro'],
  ['Marrom Claro', '#D2B48C', 'marrom', ['Tan', 'Marrom Claro'], 'marrom claro'],
  ['Marrom Médio', '#A0522D', 'marrom', ['Sienna'], 'marrom médio'],
  ['Chocolate', '#D2691E', 'marrom', [], 'chocolate'],
  ['Café', '#6F4E37', 'marrom', ['Coffee'], 'café'],
  ['Caramelo', '#AF6F09', 'marrom', ['Caramel'], 'caramelo'],
  ['Canela', '#D2691E', 'marrom', ['Cinnamon'], 'canela'],
  ['Noz', '#5C3A21', 'marrom', ['Walnut'], 'noz'],
  ['Mogno', '#C04000', 'marrom', ['Mahogany'], 'mogno'],
  ['Castanho', '#954535', 'marrom', ['Chestnut'], 'castanho'],
  ['Bronzeado', '#D2B48C', 'marrom', ['Tan'], 'bronzeado'],
  ['Areia', '#C2B280', 'marrom', ['Sand'], 'areia'],
  ['Bege Escuro', '#C19A6B', 'marrom', ['Dark Beige'], 'bege escuro'],
  ['Couro', '#8B4513', 'marrom', ['Saddle Brown'], 'couro'],
  ['Sépia', '#704214', 'marrom', ['Sepia'], 'sépia'],
  ['Terra', '#A67B5B', 'marrom', ['Earth'], 'terra'],
  ['Argila', '#A66A5E', 'marrom', ['Clay'], 'argila'],
  ['Ocre Vermelho', '#BD4A1B', 'marrom', ['Red Ochre'], 'ocre vermelho'],
  ['Ocre Amarelo', '#CC7722', 'marrom', ['Yellow Ochre'], 'ocre amarelo'],

  // ===== CINZAS =====
  ['Cinza', '#808080', 'cinza', ['Gray', 'Grey'], 'cinza médio'],
  ['Cinza Claro', '#D3D3D3', 'cinza', ['Light Gray', 'Light Grey'], 'cinza claro'],
  ['Cinza Escuro', '#595959', 'cinza', ['Dark Gray', 'Dark Grey', 'Dim Gray'], 'cinza escuro'],
  ['Cinza Muito Claro', '#F5F5F5', 'cinza', ['White Smoke'], 'cinza muito claro'],
  ['Cinza Gelo', '#E0E0E0', 'cinza', ['Gainsboro'], 'cinza gelo'],
  ['Cinza Prata', '#C0C0C0', 'cinza', ['Silver'], 'cinza prata'],
  ['Cinza Ardósia', '#708090', 'cinza', ['Slate Gray'], 'cinza ardósia'],
  ['Cinza Ardósia Claro', '#778899', 'cinza', ['Light Slate Gray'], 'cinza ardósia claro'],
  ['Cinza Ardósia Escuro', '#2F4F4F', 'cinza', ['Dark Slate Gray'], 'cinza ardósia escuro'],
  ['Cinza Dimming', '#696969', 'cinza', ['Dim Gray'], 'cinza dimming'],
  ['Cinza Granito', '#676767', 'cinza', ['Granite'], 'cinza granito'],
  ['Cinza Carvão', '#36454F', 'cinza', ['Charcoal'], 'cinza carvão'],
  ['Cinza Grafite', '#474A51', 'cinza', ['Graphite'], 'cinza grafite'],
  ['Cinza Nevoeiro', '#B8B8B8', 'cinza', ['Fog Gray'], 'cinza nevoeiro'],
  ['Cinza Platina', '#E5E4E2', 'cinza', ['Platinum'], 'cinza platina'],

  // ===== PRETO =====
  ['Preto', '#000000', 'preto', ['Black'], 'preto puro'],
  ['Preto Fosco', '#0D0D0D', 'preto', ['Matte Black'], 'preto fosco'],
  ['Preto Azulado', '#0A0A1A', 'preto', ['Blue Black'], 'preto azulado'],
  ['Preto Quente', '#1A0F0A', 'preto', ['Warm Black'], 'preto quente'],
  ['Êbano', '#0B0B0B', 'preto', ['Ebony'], 'êbano'],
  ['Obsidiana', '#0C0C0C', 'preto', ['Obsidian'], 'obsidiana'],
  ['Preto Noite', '#050505', 'preto', ['Night Black'], 'preto noite'],

  // ===== BRANCOS =====
  ['Branco', '#FFFFFF', 'branco', ['White'], 'branco puro'],
  ['Branco Neve', '#FFFAFA', 'branco', ['Snow'], 'branco neve'],
  ['Branco Fantasma', '#F8F8FF', 'branco', ['Ghost White'], 'branco fantasma'],
  ['Branco Fumaça', '#F5F5F5', 'branco', ['White Smoke'], 'branco fumaça'],
  ['Branco Floral', '#FFFAF0', 'branco', ['Floral White'], 'branco floral'],
  ['Linho', '#FAF0E6', 'branco', ['Linen'], 'linho'],
  ['Concha', '#FFF5EE', 'branco', ['Seashell'], 'concha'],
  ['Marfim Branco', '#FFFFF0', 'branco', ['Ivory'], 'marfim branco'],
  ['Pérola', '#F0F0F0', 'branco', ['Pearl'], 'pérola'],
  ['Alabastro', '#F9F9F9', 'branco', ['Alabaster'], 'alabastro'],
];

// ============================================================================
// Processamento: Converter para ColorEntry com Lab pré-calculado
// ============================================================================

function hexToRgb(hex: string): RgbColor {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return { r, g, b };
}

function computeHueChroma(lab: LabColor): { hue: number; chroma: number } {
  const { a, b } = lab;
  const chroma = Math.hypot(a, b);
  const hue = chroma === 0 ? 0 : (Math.atan2(b, a) * 180 / Math.PI + 360) % 360;
  return { hue, chroma };
}

/** Base de dados completa com Lab pré-calculado */
export const COLOR_DATABASE: ColorEntry[] = RAW_COLORS.map(([name, hex, category, synonyms, perceptualDescription]) => {
  const rgb = hexToRgb(hex);
  const lab = srgbToLab(rgb);
  const { hue, chroma } = computeHueChroma(lab);

  return {
    name,
    hex: hex.toUpperCase(),
    rgb,
    lab,
    category,
    synonyms,
    perceptualDescription,
    lightness: Math.round(lab.L * 10) / 10,
    chroma: Math.round(chroma * 10) / 10,
    hue: Math.round(hue * 10) / 10,
  };
});

// ============================================================================
// Índices e Utilitários de Busca
// ============================================================================

/** Mapa nome → entrada (para lookup O(1)) */
export const COLOR_BY_NAME: Map<string, ColorEntry> = new Map(
  COLOR_DATABASE.map(c => [c.name.toLowerCase(), c])
);

/** Mapa hex → entrada */
export const COLOR_BY_HEX: Map<string, ColorEntry> = new Map(
  COLOR_DATABASE.map(c => [c.hex.toLowerCase(), c])
);

/** Cores por categoria */
export const COLORS_BY_CATEGORY: Map<ColorCategory, ColorEntry[]> = new Map();
for (const color of COLOR_DATABASE) {
  const arr = COLORS_BY_CATEGORY.get(color.category) || [];
  arr.push(color);
  COLORS_BY_CATEGORY.set(color.category, arr);
}

/** Array de Lab para LUT de Delta E */
export const COLOR_LABS: LabColor[] = COLOR_DATABASE.map(c => c.lab);

/** Nomes disponíveis */
export function getAvailableColorNames(): string[] {
  return COLOR_DATABASE.map(c => c.name);
}

/** Busca por nome exato (case-insensitive) */
export function findColorByName(name: string): ColorEntry | undefined {
  return COLOR_BY_NAME.get(name.toLowerCase());
}

/** Busca por hex (com ou sem #) */
export function findColorByHex(hex: string): ColorEntry | undefined {
  const clean = hex.startsWith('#') ? hex.slice(1).toLowerCase() : hex.toLowerCase();
  return COLOR_BY_HEX.get(`#${clean}`);
}

/** Busca por categoria */
export function getColorsByCategory(category: ColorCategory): ColorEntry[] {
  return COLORS_BY_CATEGORY.get(category) || [];
}

/** Obtém entrada completa por índice */
export function getColorEntry(index: number): ColorEntry | undefined {
  return COLOR_DATABASE[index];
}

/** Total de cores na base */
export const COLOR_DATABASE_SIZE = COLOR_DATABASE.length;

// ============================================================================
// Exportar tipos para uso externo
// ============================================================================

export type { RgbColor, LabColor, XyzColor } from './color-science';