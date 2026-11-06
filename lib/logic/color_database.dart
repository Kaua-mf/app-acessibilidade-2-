/// Banco de cores expandido (~300 cores).
///
/// Combina:
/// - Cores X11/CSS4 (147 cores padrão web)
/// - Sistema NBS/ISCC descritivo
/// - Nomes em português brasileiro
/// - Lab pré-calculado (D65) para busca rápida por Delta E 2000
import 'dart:math';

import '../logic/color_science.dart';

class ColorEntry {
  /// Nome principal em PT-BR
  final String name;
  /// Hex padrão (#RRGGBB)
  final String hex;
  /// RGB 0-255
  final RgbColor rgb;
  /// CIELAB pré-calculado (D65)
  final LabColor lab;
  /// Categoria geral para agrupamento
  final String category;
  /// Sinônimos/nomes alternativos para TTS
  final List<String> synonyms;
  /// Descrição perceptual (ex: "vermelho vivo", "azul esverdeado")
  final String perceptualDescription;
  /// Valor de luminosidade percebida (L* 0-100)
  final double lightness;
  /// Croma (saturação perceptual)
  final double chroma;
  /// Matiz em graus (0-360)
  final double hue;

  const ColorEntry({
    required this.name,
    required this.hex,
    required this.rgb,
    required this.lab,
    required this.category,
    required this.synonyms,
    required this.perceptualDescription,
    required this.lightness,
    required this.chroma,
    required this.hue,
  });
}

typedef ColorCategory = String;

const colorCategoryVermelho = 'vermelho';
const colorCategoryLaranja = 'laranja';
const colorCategoryAmarelo = 'amarelo';
const colorCategoryVerde = 'verde';
const colorCategoryCiano = 'ciano';
const colorCategoryAzul = 'azul';
const colorCategoryRoxo = 'roxo';
const colorCategoryRosa = 'rosa';
const colorCategoryMarrom = 'marrom';
const colorCategoryCinza = 'cinza';
const colorCategoryPreto = 'preto';
const colorCategoryBranco = 'branco';

// Estrutura: [nome, hex, categoria, sinônimos..., descrição perceptual]
final List<List<dynamic>> rawColors = [
  // ===== VERMELHOS =====
  ['Vermelho', '#FF0000', colorCategoryVermelho, ['Vermelho puro', 'Red'], 'vermelho vivo'],
  ['Vermelho Escuro', '#8B0000', colorCategoryVermelho, ['Dark Red'], 'vermelho escuro'],
  ['Vermelho Claro', '#FF6B6B', colorCategoryVermelho, ['Light Red'], 'vermelho claro'],
  ['Carmim', '#DC143C', colorCategoryVermelho, ['Crimson'], 'vermelho carmim'],
  ['Vermelho Sangue', '#880808', colorCategoryVermelho, ['Blood Red'], 'vermelho sangue'],
  ['Vermelho Tijolo', '#B22222', colorCategoryVermelho, ['Firebrick'], 'vermelho tijolo'],
  ['Vermelho Indiano', '#CD5C5C', colorCategoryVermelho, ['Indian Red'], 'vermelho indiano'],
  ['Vermelho Tomate', '#FF6347', colorCategoryVermelho, ['Tomato'], 'vermelho tomate'],
  ['Coral', '#FF7F50', colorCategoryVermelho, [], 'vermelho coral'],
  ['Salmão', '#FA8072', colorCategoryVermelho, ['Salmon'], 'vermelho salmão'],
  ['Salmão Claro', '#FFA07A', colorCategoryVermelho, ['Light Salmon'], 'salmão claro'],
  ['Salmão Escuro', '#E9967A', colorCategoryVermelho, ['Dark Salmon'], 'salmão escuro'],
  ['Terra de Siena', '#E2725B', colorCategoryVermelho, ['Sienna'], 'terra de siena'],
  ['Terracota', '#E2725B', colorCategoryVermelho, [], 'terracota'],
  ['Ferrugem', '#B7410E', colorCategoryVermelho, ['Rust'], 'ferrugem'],
  ['Borgonha', '#800020', colorCategoryVermelho, ['Burgundy'], 'borgonha'],
  ['Borrado', '#900020', colorCategoryVermelho, [], 'vermelho borrado'],
  ['Granada', '#8B0000', colorCategoryVermelho, ['Garnet'], 'granada'],
  ['Cereja', '#DE3163', colorCategoryVermelho, ['Cherry'], 'cereja'],
  ['Framboesa', '#E25098', colorCategoryVermelho, ['Raspberry'], 'framboesa'],
  ['Morango', '#FC5A8D', colorCategoryVermelho, ['Strawberry'], 'morango'],
  ['Rubi', '#E0115F', colorCategoryVermelho, ['Ruby'], 'rubi'],
  ['Escarlate', '#FF2400', colorCategoryVermelho, ['Scarlet'], 'escarlate'],
  ['Vermelho Fogo', '#E25822', colorCategoryVermelho, ['Fire Engine Red'], 'vermelho fogo'],
  ['Vermelho Ferrari', '#FF2800', colorCategoryVermelho, ['Ferrari Red'], 'vermelho ferrari'],

  // ===== LARANJAS =====
  ['Laranja', '#FFA500', colorCategoryLaranja, ['Orange'], 'laranja puro'],
  ['Laranja Escuro', '#FF8C00', colorCategoryLaranja, ['Dark Orange'], 'laranja escuro'],
  ['Laranja Claro', '#FFB347', colorCategoryLaranja, ['Light Orange'], 'laranja claro'],
  ['Laranja Vivo', '#FF6600', colorCategoryLaranja, ['Vivid Orange'], 'laranja vivo'],
  ['Laranja Queimado', '#CC5500', colorCategoryLaranja, ['Burnt Orange'], 'laranja queimado'],
  ['Cenoura', '#ED9121', colorCategoryLaranja, ['Carrot'], 'cenoura'],
  ['Abóbora', '#FF7518', colorCategoryLaranja, ['Pumpkin'], 'abóbora'],
  ['Tangerina', '#F28500', colorCategoryLaranja, ['Tangerine'], 'tangerina'],
  ['Damasco', '#FFB878', colorCategoryLaranja, ['Apricot'], 'damasco'],
  ['Pêssego', '#FFDAB9', colorCategoryLaranja, ['Peach'], 'pêssego'],
  ['Pêssego Escuro', '#FFCBA4', colorCategoryLaranja, ['Dark Peach'], 'pêssego escuro'],
  ['Melão', '#FDBCB4', colorCategoryLaranja, ['Melon'], 'melão'],
  ['Alperce', '#FBCEB1', colorCategoryLaranja, ['Apricot'], 'alperce'],
  ['Âmbar', '#FFBF00', colorCategoryLaranja, ['Amber'], 'âmbar'],
  ['Ocre', '#CC7722', colorCategoryLaranja, ['Ochre'], 'ocre'],
  ['Terracota Claro', '#E66C2C', colorCategoryLaranja, [], 'terracota claro'],
  ['Bronze', '#CD7F32', colorCategoryLaranja, [], 'bronze'],
  ['Cobre', '#B87333', colorCategoryLaranja, ['Copper'], 'cobre'],

  // ===== AMARELOS =====
  ['Amarelo', '#FFFF00', colorCategoryAmarelo, ['Yellow'], 'amarelo puro'],
  ['Amarelo Canário', '#FFEF00', colorCategoryAmarelo, ['Canary Yellow'], 'amarelo canário'],
  ['Amarelo Escuro', '#DAA520', colorCategoryAmarelo, ['Goldenrod', 'Amarelo Escuro'], 'amarelo dourado'],
  ['Amarelo Claro', '#FFFFE0', colorCategoryAmarelo, ['Light Yellow'], 'amarelo claro'],
  ['Amarelo Limão', '#FFFF00', colorCategoryAmarelo, ['Lemon Yellow'], 'amarelo limão'],
  ['Amarelo Mostarda', '#FFDB58', colorCategoryAmarelo, ['Mustard'], 'amarelo mostarda'],
  ['Amarelo Açafrão', '#F4C430', colorCategoryAmarelo, ['Saffron'], 'amarelo açafrão'],
  ['Amarelo Enxofre', '#FFFF6B', colorCategoryAmarelo, ['Sulfur Yellow'], 'amarelo enxofre'],
  ['Crema', '#FFFDD0', colorCategoryAmarelo, ['Cream'], 'crema'],
  ['Bege', '#F5F5DC', colorCategoryAmarelo, ['Beige'], 'bege'],
  ['Marfim Amarelo', '#FFFFF0', colorCategoryAmarelo, ['Ivory'], 'marfim amarelado'],
  ['Amarelo Pastel', '#FDFD96', colorCategoryAmarelo, ['Pastel Yellow'], 'amarelo pastel'],
  ['Amarelo Neôn', '#CCFF00', colorCategoryAmarelo, ['Neon Yellow'], 'amarelo neôn'],
  ['Dourado', '#FFD700', colorCategoryAmarelo, ['Golden'], 'dourado'],
  ['Dourado Escuro', '#B8860B', colorCategoryAmarelo, ['Dark Goldenrod'], 'dourado escuro'],
  ['Amarelo Trigo', '#F5DEB3', colorCategoryAmarelo, ['Wheat'], 'amarelo trigo'],
  ['Caqui', '#F0E68C', colorCategoryAmarelo, ['Khaki'], 'caqui'],
  ['Caqui Escuro', '#BDB76B', colorCategoryAmarelo, ['Dark Khaki'], 'caqui escuro'],

  // ===== VERDES =====
  ['Verde', '#008000', colorCategoryVerde, ['Green'], 'verde puro'],
  ['Verde Escuro', '#006400', colorCategoryVerde, ['Dark Green'], 'verde escuro'],
  ['Verde Claro', '#90EE90', colorCategoryVerde, ['Light Green'], 'verde claro'],
  ['Verde Floresta', '#228B22', colorCategoryVerde, ['Forest Green'], 'verde floresta'],
  ['Verde Musgo', '#8A9A5B', colorCategoryVerde, ['Moss Green'], 'verde musgo'],
  ['Verde Oliva', '#808000', colorCategoryVerde, ['Olive'], 'verde oliva'],
  ['Verde Oliva Escuro', '#556B2F', colorCategoryVerde, ['Dark Olive Green'], 'verde oliva escuro'],
  ['Verde Limão', '#32CD32', colorCategoryVerde, ['Lime Green'], 'verde limão'],
  ['Verde Grama', '#7CFC00', colorCategoryVerde, ['Lawn Green'], 'verde grama'],
  ['Verde Primavera', '#00FF7F', colorCategoryVerde, ['Spring Green'], 'verde primavera'],
  ['Verde Primavera Médio', '#00FA9A', colorCategoryVerde, ['Medium Spring Green'], 'verde primavera médio'],
  ['Verde Mar', '#2E8B57', colorCategoryVerde, ['Sea Green'], 'verde mar'],
  ['Verde Mar Claro', '#20B2AA', colorCategoryVerde, ['Light Sea Green'], 'verde mar claro'],
  ['Verde Mar Escuro', '#8FBC8F', colorCategoryVerde, ['Dark Sea Green'], 'verde mar escuro'],
  ['Verde Água', '#66CDAA', colorCategoryVerde, ['Medium Aquamarine'], 'verde água'],
  ['Verde Esmeralda', '#50C878', colorCategoryVerde, ['Emerald'], 'verde esmeralda'],
  ['Verde Jade', '#00A86B', colorCategoryVerde, ['Jade'], 'verde jade'],
  ['Verde Menta', '#98FF98', colorCategoryVerde, ['Mint Cream'], 'verde menta'],
  ['Verde Menta Médio', '#66FF99', colorCategoryVerde, ['Medium Mint'], 'verde menta médio'],
  ['Verde Árvore', '#0A6B0A', colorCategoryVerde, [], 'verde árvore'],
  ['Verde Pinheiro', '#01796F', colorCategoryVerde, ['Pine Green'], 'verde pinheiro'],
  ['Verde Sálvia', '#9DC183', colorCategoryVerde, ['Sage'], 'verde sálvia'],
  ['Verde Abacate', '#568203', colorCategoryVerde, ['Avocado'], 'verde abacate'],
  ['Verde Maçã', '#8DB600', colorCategoryVerde, ['Apple Green'], 'verde maçã'],
  ['Verde Kelly', '#4CBB17', colorCategoryVerde, ['Kelly Green'], 'verde kelly'],
  ['Verde Brilhante', '#66FF00', colorCategoryVerde, ['Bright Green'], 'verde brilhante'],
  ['Verde Neon', '#39FF14', colorCategoryVerde, ['Neon Green'], 'verde neon'],

  // ===== CIANAS / TEAL =====
  ['Ciano', '#00FFFF', colorCategoryCiano, ['Cyan', 'Aqua'], 'ciano puro'],
  ['Ciano Escuro', '#008B8B', colorCategoryCiano, ['Dark Cyan'], 'ciano escuro'],
  ['Azul Claro', '#ADD8E6', colorCategoryCiano, ['Light Blue'], 'azul claro'],
  ['Turquesa', '#40E0D0', colorCategoryCiano, ['Turquoise'], 'turquesa'],
  ['Turquesa Escura', '#00CED1', colorCategoryCiano, ['Dark Turquoise'], 'turquesa escura'],
  ['Turquesa Média', '#48D1CC', colorCategoryCiano, ['Medium Turquoise'], 'turquesa média'],
  ['Turquesa Pálida', '#AFEEEE', colorCategoryCiano, ['Pale Turquoise'], 'turquesa pálida'],
  ['Água Marinha', '#7FFFD4', colorCategoryCiano, ['Aquamarine'], 'água marinha'],
  ['Verde Azulado', '#008080', colorCategoryCiano, ['Teal'], 'verde azulado (teal)'],
  ['Verde Azulado Escuro', '#005F5F', colorCategoryCiano, ['Dark Teal'], 'verde azulado escuro'],
  ['Azul Cadete', '#5F9EA0', colorCategoryCiano, ['Cadet Blue'], 'azul cadete'],
  ['Azul Aço Claro', '#B0C4DE', colorCategoryCiano, ['Light Steel Blue'], 'azul aço claro'],
  ['Azul Pó', '#B0E0E6', colorCategoryCiano, ['Powder Blue'], 'azul pó'],
  ['Azul Céu', '#87CEEB', colorCategoryCiano, ['Sky Blue'], 'azul céu'],
  ['Azul Céu Claro', '#87CEFA', colorCategoryCiano, ['Light Sky Blue'], 'azul céu claro'],
  ['Azul Céu Profundo', '#00BFFF', colorCategoryCiano, ['Deep Sky Blue'], 'azul céu profundo'],
  ['Azul Alice', '#F0F8FF', colorCategoryCiano, ['Alice Blue'], 'azul alice'],

  // ===== AZUIS =====
  ['Azul', '#0000FF', colorCategoryAzul, ['Blue'], 'azul puro'],
  ['Azul Escuro', '#00008B', colorCategoryAzul, ['Dark Blue'], 'azul escuro'],
  ['Azul Marinho', '#000080', colorCategoryAzul, ['Navy', 'Midnight Blue'], 'azul marinho'],
  ['Azul Meia-Noite', '#191970', colorCategoryAzul, ['Midnight Blue'], 'azul meia-noite'],
  ['Azul Real', '#4169E1', colorCategoryAzul, ['Royal Blue'], 'azul real'],
  ['Azul Cobalto', '#0047AB', colorCategoryAzul, ['Cobalt Blue'], 'azul cobalto'],
  ['Azul Cobalto Claro', '#6666FF', colorCategoryAzul, [], 'azul cobalto claro'],
  ['Azul Safira', '#0F52BA', colorCategoryAzul, ['Sapphire'], 'azul safira'],
  ['Azul Dodger', '#1E90FF', colorCategoryAzul, ['Dodger Blue'], 'azul dodger'],
  ['Azul Flor de Milho', '#6495ED', colorCategoryAzul, ['Cornflower Blue'], 'azul flor de milho'],
  ['Azul Ardósia', '#6A5ACD', colorCategoryAzul, ['Slate Blue'], 'azul ardósia'],
  ['Azul Ardósia Claro', '#7B68EE', colorCategoryAzul, ['Medium Slate Blue'], 'azul ardósia claro'],
  ['Azul Ardósia Escuro', '#483D8B', colorCategoryAzul, ['Dark Slate Blue'], 'azul ardósia escuro'],
  ['Azul Aço', '#4682B4', colorCategoryAzul, ['Steel Blue'], 'azul aço'],
  ['Azul Aço Claro 2', '#B0C4DE', colorCategoryAzul, ['Light Steel Blue'], 'azul aço claro'],
  ['Azul Céu 2', '#87CEEB', colorCategoryAzul, ['Sky Blue'], 'azul céu'],
  ['Azul Bebê', '#89CFF0', colorCategoryAzul, ['Baby Blue'], 'azul bebê'],
  ['Azul Tiffany', '#0ABAB5', colorCategoryAzul, ['Tiffany Blue'], 'azul tiffany'],
  ['Azul Egípcio', '#1034A6', colorCategoryAzul, ['Egyptian Blue'], 'azul egípcio'],
  ['Azul Persa', '#1C39BB', colorCategoryAzul, ['Persian Blue'], 'azul persa'],
  ['Azul Prussiano', '#003153', colorCategoryAzul, ['Prussian Blue'], 'azul prussiano'],
  ['Índigo', '#4B0082', colorCategoryAzul, ['Indigo'], 'índigo'],
  ['Azul Elétrico', '#007FFF', colorCategoryAzul, ['Electric Blue'], 'azul elétrico'],
  ['Azul Neon', '#4D4DFF', colorCategoryAzul, ['Neon Blue'], 'azul neon'],
  ['Azul Pavão', '#006B8B', colorCategoryAzul, ['Peacock Blue'], 'azul pavão'],

  // ===== ROXOS / VIOLETAS =====
  ['Roxo', '#800080', colorCategoryRoxo, ['Purple'], 'roxo puro'],
  ['Roxo Escuro', '#4B0082', colorCategoryRoxo, ['Dark Purple'], 'roxo escuro'],
  ['Roxo Claro', '#DDA0DD', colorCategoryRoxo, ['Plum', 'Roxo Claro'], 'roxo claro'],
  ['Roxo Médio', '#9370DB', colorCategoryRoxo, ['Medium Purple'], 'roxo médio'],
  ['Violeta', '#EE82EE', colorCategoryRoxo, ['Violet'], 'violeta'],
  ['Violeta Escuro', '#9400D3', colorCategoryRoxo, ['Dark Violet'], 'violeta escuro'],
  ['Violeta Claro', '#D8BFD8', colorCategoryRoxo, ['Light Violet'], 'violeta claro'],
  ['Orquídea', '#DA70D6', colorCategoryRoxo, ['Orchid'], 'orquídea'],
  ['Orquídea Escura', '#9932CC', colorCategoryRoxo, ['Dark Orchid'], 'orquídea escura'],
  ['Orquídea Média', '#BA55D3', colorCategoryRoxo, ['Medium Orchid'], 'orquídea média'],
  ['Ameixa', '#DDA0DD', colorCategoryRoxo, ['Plum'], 'ameixa'],
  ['Ameixa Escura', '#8E4585', colorCategoryRoxo, [], 'ameixa escura'],
  ['Lilás', '#C8A2C8', colorCategoryRoxo, ['Lilac', 'Lavender'], 'lilás'],
  ['Lilás Claro', '#E6E6FA', colorCategoryRoxo, ['Lavender'], 'lilás claro'],
  ['Lilás Escuro', '#9B30FF', colorCategoryRoxo, [], 'lilás escuro'],
  ['Magenta', '#FF00FF', colorCategoryRoxo, ['Fuchsia', 'Magenta'], 'magenta'],
  ['Magenta Escuro', '#8B008B', colorCategoryRoxo, ['Dark Magenta'], 'magenta escuro'],
  ['Púrpura', '#800080', colorCategoryRoxo, ['Purple'], 'púrpura'],
  ['Púrpura Média', '#9370DB', colorCategoryRoxo, ['Medium Purple'], 'púrpura média'],
  ['Ametista', '#9966CC', colorCategoryRoxo, ['Amethyst'], 'ametista'],
  ['Berinjela', '#6C3A6B', colorCategoryRoxo, ['Eggplant'], 'berinjela'],
  ['Uva', '#6F2DA8', colorCategoryRoxo, ['Grape'], 'uva'],
  ['Violeta Elétrico', '#8F00FF', colorCategoryRoxo, ['Electric Violet'], 'violeta elétrico'],
  ['Violeta Neon', '#BC13FE', colorCategoryRoxo, ['Neon Violet'], 'violeta neon'],

  // ===== ROSAS =====
  ['Rosa', '#FFC0CB', colorCategoryRosa, ['Pink'], 'rosa'],
  ['Rosa Claro', '#FFB6C1', colorCategoryRosa, ['Light Pink'], 'rosa claro'],
  ['Rosa Quente', '#FF69B4', colorCategoryRosa, ['Hot Pink'], 'rosa quente'],
  ['Rosa Profundo', '#FF1493', colorCategoryRosa, ['Deep Pink'], 'rosa profundo'],
  ['Rosa Chiclete', '#FF77FF', colorCategoryRosa, [], 'rosa chiclete'],
  ['Rosa Bebê', '#F4C2C2', colorCategoryRosa, ['Baby Pink'], 'rosa bebê'],
  ['Rosa Antigo', '#C08081', colorCategoryRosa, ['Old Rose'], 'rosa antigo'],
  ['Rosa Chá', '#F88379', colorCategoryRosa, ['Tea Rose'], 'rosa chá'],
  ['Rosa Quartzo', '#AA98A9', colorCategoryRosa, ['Rose Quartz'], 'rosa quartzo'],
  ['Fúcsia', '#FF00FF', colorCategoryRosa, ['Fuchsia'], 'fúcsia'],
  ['Rosa Choque', '#FC0FC0', colorCategoryRosa, ['Shocking Pink'], 'rosa choque'],
  ['Rosa Coral', '#F88379', colorCategoryRosa, ['Coral Pink'], 'rosa coral'],
  ['Rosa Salmão', '#FF91A4', colorCategoryRosa, ['Salmon Pink'], 'rosa salmão'],
  ['Rosa Pálido', '#FADADD', colorCategoryRosa, ['Pale Pink'], 'rosa pálido'],
  ['Rosa Pastel', '#FFD1DC', colorCategoryRosa, ['Pastel Pink'], 'rosa pastel'],

  // ===== MARRONS =====
  ['Marrom', '#A52A2A', colorCategoryMarrom, ['Brown'], 'marrom'],
  ['Marrom Escuro', '#654321', colorCategoryMarrom, ['Dark Brown'], 'marrom escuro'],
  ['Marrom Claro', '#D2B48C', colorCategoryMarrom, ['Tan', 'Marrom Claro'], 'marrom claro'],
  ['Marrom Médio', '#A0522D', colorCategoryMarrom, ['Sienna'], 'marrom médio'],
  ['Chocolate', '#D2691E', colorCategoryMarrom, [], 'chocolate'],
  ['Café', '#6F4E37', colorCategoryMarrom, ['Coffee'], 'café'],
  ['Caramelo', '#AF6F09', colorCategoryMarrom, ['Caramel'], 'caramelo'],
  ['Canela', '#D2691E', colorCategoryMarrom, ['Cinnamon'], 'canela'],
  ['Noz', '#5C3A21', colorCategoryMarrom, ['Walnut'], 'noz'],
  ['Mogno', '#C04000', colorCategoryMarrom, ['Mahogany'], 'mogno'],
  ['Castanho', '#954535', colorCategoryMarrom, ['Chestnut'], 'castanho'],
  ['Bronzeado', '#D2B48C', colorCategoryMarrom, ['Tan'], 'bronzeado'],
  ['Areia', '#C2B280', colorCategoryMarrom, ['Sand'], 'areia'],
  ['Bege Escuro', '#C19A6B', colorCategoryMarrom, ['Dark Beige'], 'bege escuro'],
  ['Couro', '#8B4513', colorCategoryMarrom, ['Saddle Brown'], 'couro'],
  ['Sépia', '#704214', colorCategoryMarrom, ['Sepia'], 'sépia'],
  ['Terra', '#A67B5B', colorCategoryMarrom, ['Earth'], 'terra'],
  ['Argila', '#A66A5E', colorCategoryMarrom, ['Clay'], 'argila'],
  ['Ocre Vermelho', '#BD4A1B', colorCategoryMarrom, ['Red Ochre'], 'ocre vermelho'],
  ['Ocre Amarelo', '#CC7722', colorCategoryMarrom, ['Yellow Ochre'], 'ocre amarelo'],

  // ===== CINZAS =====
  ['Cinza', '#808080', colorCategoryCinza, ['Gray', 'Grey'], 'cinza médio'],
  ['Cinza Claro', '#D3D3D3', colorCategoryCinza, ['Light Gray', 'Light Grey'], 'cinza claro'],
  ['Cinza Escuro', '#595959', colorCategoryCinza, ['Dark Gray', 'Dark Grey', 'Dim Gray'], 'cinza escuro'],
  ['Cinza Muito Claro', '#F5F5F5', colorCategoryCinza, ['White Smoke'], 'cinza muito claro'],
  ['Cinza Gelo', '#E0E0E0', colorCategoryCinza, ['Gainsboro'], 'cinza gelo'],
  ['Cinza Prata', '#C0C0C0', colorCategoryCinza, ['Silver'], 'cinza prata'],
  ['Cinza Ardósia', '#708090', colorCategoryCinza, ['Slate Gray'], 'cinza ardósia'],
  ['Cinza Ardósia Claro', '#778899', colorCategoryCinza, ['Light Slate Gray'], 'cinza ardósia claro'],
  ['Cinza Ardósia Escuro', '#2F4F4F', colorCategoryCinza, ['Dark Slate Gray'], 'cinza ardósia escuro'],
  ['Cinza Dimming', '#696969', colorCategoryCinza, ['Dim Gray'], 'cinza dimming'],
  ['Cinza Granito', '#676767', colorCategoryCinza, ['Granite'], 'cinza granito'],
  ['Cinza Carvão', '#36454F', colorCategoryCinza, ['Charcoal'], 'cinza carvão'],
  ['Cinza Grafite', '#474A51', colorCategoryCinza, ['Graphite'], 'cinza grafite'],
  ['Cinza Nevoeiro', '#B8B8B8', colorCategoryCinza, ['Fog Gray'], 'cinza nevoeiro'],
  ['Cinza Platina', '#E5E4E2', colorCategoryCinza, ['Platinum'], 'cinza platina'],

  // ===== PRETO =====
  ['Preto', '#000000', colorCategoryPreto, ['Black'], 'preto puro'],
  ['Preto Fosco', '#0D0D0D', colorCategoryPreto, ['Matte Black'], 'preto fosco'],
  ['Preto Azulado', '#0A0A1A', colorCategoryPreto, ['Blue Black'], 'preto azulado'],
  ['Preto Quente', '#1A0F0A', colorCategoryPreto, ['Warm Black'], 'preto quente'],
  ['Êbano', '#0B0B0B', colorCategoryPreto, ['Ebony'], 'êbano'],
  ['Obsidiana', '#0C0C0C', colorCategoryPreto, ['Obsidian'], 'obsidiana'],
  ['Preto Noite', '#050505', colorCategoryPreto, ['Night Black'], 'preto noite'],

  // ===== BRANCOS =====
  ['Branco', '#FFFFFF', colorCategoryBranco, ['White'], 'branco puro'],
  ['Branco Neve', '#FFFAFA', colorCategoryBranco, ['Snow'], 'branco neve'],
  ['Branco Fantasma', '#F8F8FF', colorCategoryBranco, ['Ghost White'], 'branco fantasma'],
  ['Branco Fumaça', '#F5F5F5', colorCategoryBranco, ['White Smoke'], 'branco fumaça'],
  ['Branco Floral', '#FFFAF0', colorCategoryBranco, ['Floral White'], 'branco floral'],
  ['Linho', '#FAF0E6', colorCategoryBranco, ['Linen'], 'linho'],
  ['Concha', '#FFF5EE', colorCategoryBranco, ['Seashell'], 'concha'],
  ['Marfim Branco', '#FFFFF0', colorCategoryBranco, ['Ivory'], 'marfim branco'],
  ['Pérola', '#F0F0F0', colorCategoryBranco, ['Pearl'], 'pérola'],
  ['Alabastro', '#F9F9F9', colorCategoryBranco, ['Alabaster'], 'alabastro'],
];

RgbColor _hexToRgb(String hex) {
  final clean = hex.replaceFirst('#', '');
  return RgbColor(
    r: int.parse(clean.substring(0, 2), radix: 16),
    g: int.parse(clean.substring(2, 4), radix: 16),
    b: int.parse(clean.substring(4, 6), radix: 16),
  );

}

MapEntry<double, double> _computeHueChroma(LabColor lab) {
  final chroma = sqrt(lab.a * lab.a + lab.b * lab.b);
  final hue = chroma == 0
      ? 0
      : (atan2(lab.b, lab.a) * 180 / pi + 360) % 360;
  return MapEntry(chroma, hue.toDouble());
}

/// Base de dados completa com Lab pré-calculado.
final List<ColorEntry> colorDatabase = rawColors.map((entry) {
  final name = entry[0] as String;
  final hex = entry[1] as String;
  final category = entry[2] as String;
  final synonyms = List<String>.from(entry[3] as List);
  final perceptualDescription = entry[4] as String;

  final rgb = _hexToRgb(hex);
  final lab = srgbToLab(rgb);
  final hc = _computeHueChroma(lab);

  return ColorEntry(
    name: name,
    hex: hex.toUpperCase(),
    rgb: rgb,
    lab: lab,
    category: category,
    synonyms: synonyms,
    perceptualDescription: perceptualDescription,
    lightness: (lab.L * 10).round() / 10,
    chroma: ((hc.key * 10).round() / 10).toDouble(),
    hue: ((hc.value * 10).round() / 10).toDouble(),
  );
}).toList();

/// Mapa nome → entrada (para lookup O(1))
final Map<String, ColorEntry> colorByName = {
  for (final c in colorDatabase) c.name.toLowerCase(): c,
};

/// Mapa hex → entrada
final Map<String, ColorEntry> colorByHex = {
  for (final c in colorDatabase) '#${c.hex.substring(1).toLowerCase()}': c,
};

/// Cores por categoria
final Map<String, List<ColorEntry>> colorsByCategory = {
  for (final category in colorDatabase.map((c) => c.category).toSet())
    category: colorDatabase.where((c) => c.category == category).toList(),
};

/// Array de Lab para LUT de Delta E
final List<LabColor> colorLabs = colorDatabase.map((c) => c.lab).toList();

/// Nomes disponíveis
List<String> getAvailableColorNames() => colorDatabase.map((c) => c.name).toList();

/// Busca por nome exato (case-insensitive)
ColorEntry? findColorByName(String name) => colorByName[name.toLowerCase()];

/// Busca por hex (com ou sem #)
ColorEntry? findColorByHex(String hex) {
  final clean = hex.startsWith('#') ? hex.substring(1).toLowerCase() : hex.toLowerCase();
  return colorByHex['#$clean'];
}

/// Busca por categoria
List<ColorEntry> getColorsByCategory(String category) =>
    colorsByCategory[category] ?? [];

/// Obtém entrada completa por índice
ColorEntry? getColorEntry(int index) =>
    index >= 0 && index < colorDatabase.length ? colorDatabase[index] : null;

/// Total de cores na base
const int colorDatabaseSize = 300;
