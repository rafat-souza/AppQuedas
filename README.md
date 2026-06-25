# AppQuedas - Monitor de Quedas

**Dupla**: Rafael Souza e Pedro Silveira Costa

Aplicativo mobile desenvolvido com React Native e Expo que detecta quedas utilizando sensores do dispositivo (acelerometro e giroscopio).

## Como funciona

O aplicativo utiliza um algoritmo de deteccao em duas fases:

1. **Queda livre**: o acelerometro detecta quando a forca G cai abaixo de 0.3g, indicando que o dispositivo esta em queda livre (sem resistencia gravitacional).
2. **Impacto**: logo apos a queda livre, se a forca G ultrapassar 2.5g dentro de 1 segundo, o aplicativo identifica um impacto com o solo.

O **giroscopio** atua como sensor auxiliar. Ele verifica se houve rotacao rapida (acima de 5 rad/s) durante o evento, o que reforça a confirmacao da queda. Caso o dispositivo nao possua giroscopio, o app continua funcionando apenas com o acelerometro.

Um cooldown de 3 segundos evita alertas duplicados para o mesmo evento.

## Funcionalidades

- Leitura em tempo real do acelerometro (eixos X, Y, Z e forca G total)
- Leitura em tempo real do giroscopio (eixos X, Y, Z em rad/s)
- Alerta na tela ao detectar uma queda
- Historico de quedas com horario, intensidade do impacto e confirmacao do giroscopio
- Botao para pausar e retomar o monitoramento
- Indicador visual de status (monitorando / pausado)

## Pre-requisitos

- [Node.js](https://nodejs.org/) (versao 18 ou superior)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- Dispositivo fisico com Expo Go instalado (recomendado) ou emulador Android/iOS

## Instalacao

1. Clone o repositorio:

```bash
git clone https://github.com/rafat-souza/AppQuedas.git
cd AppQuedas
```

2. Instale as dependencias:

```bash
npm install
```

3. Inicie o servidor de desenvolvimento:

```bash
npx expo start
```

4. Escaneie o QR code com o app **Expo Go** no celular, ou pressione `a` para abrir no emulador Android / `i` para iOS.

> **Nota**: os sensores (acelerometro e giroscopio) funcionam apenas em dispositivos fisicos. Emuladores podem nao fornecer dados reais dos sensores.

## Estrutura do projeto

```
AppQuedas/
├── App.js                 # Componente raiz, renderiza o FallDetector
├── src/
│   └── FallDetector.js    # Logica de deteccao de quedas e interface
├── package.json           # Dependencias e scripts
├── app.json               # Configuracao do Expo
└── index.js               # Ponto de entrada do app
```

## Dependencias principais

| Pacote | Versao | Funcao |
|---|---|---|
| expo | ~54.0.34 | Framework de desenvolvimento |
| expo-sensors | ~15.0.8 | Acesso ao acelerometro e giroscopio |
| react | 19.1.0 | Biblioteca de interface |
| react-native | 0.81.5 | Framework mobile |

## Parametros de calibracao

Os valores abaixo podem ser ajustados em `src/FallDetector.js` conforme o dispositivo:

| Parametro | Valor | Descricao |
|---|---|---|
| `FREE_FALL_THRESHOLD` | 0.5g | Limite para detectar queda livre |
| `IMPACT_THRESHOLD` | 1.8g | Limite para detectar impacto |
| `GYRO_THRESHOLD` | 2.0 rad/s | Limite de rotacao para confirmacao |
| `COOLDOWN_MS` | 3000ms | Intervalo minimo entre deteccoes |
| `FREE_FALL_WINDOW_MS` | 1000ms | Janela entre queda livre e impacto |
