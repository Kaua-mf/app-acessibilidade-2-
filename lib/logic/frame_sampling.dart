/// Largura (em pixels) da amostra reduzida que é decodificada.
const int sampleWidth = 64;

/// Converte o "tamanho da região" da calibração (5-50) no raio, em pixels,
/// da região média na amostra reduzida.
///
/// Interpretação: regionSize é a metade do lado do quadrado central, em % do
/// lado menor da imagem. Com o padrão 20, o quadrado lido tem 40% do lado
/// menor, parecido com o tamanho da moldura na tela. Com 50, lê a imagem toda.
int regionRadiusFromSetting(int regionSize, int width, int height) {
  final clampedSize = regionSize.clamp(5, 50);
  final shortSide = width < height ? width : height;
  return (shortSide * clampedSize / 100).round().clamp(1, shortSide);
}
