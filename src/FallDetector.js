import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Alert,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { Accelerometer, Gyroscope } from "expo-sensors";

// --- Constantes de calibracao do algoritmo ---
// Fase 1 (queda livre): quando a forca G cai abaixo deste valor, o dispositivo
// esta em queda livre (proximo de 0g = sem resistencia gravitacional).
// 0.5g permite detectar quedas curtas como uma jogada leve em uma mesa.
const FREE_FALL_THRESHOLD = 0.5;

// Fase 2 (impacto): forca G acima deste valor indica colisao com uma superficie.
// Um celular parado marca ~1g; uma jogada leve em mesa gera ~1.5-2g.
const IMPACT_THRESHOLD = 1.8;

// Limiar do giroscopio (rad/s): rotacao durante o impacto reforça
// a hipotese de queda, ja que o corpo/dispositivo gira ao cair.
// 2.0 rad/s captura rotacoes suaves de uma queda leve.
const GYRO_THRESHOLD = 2.0;

// Tempo minimo entre deteccoes consecutivas para evitar alertas duplicados.
const COOLDOWN_MS = 3000;

// Janela maxima entre a queda livre e o impacto. Se o impacto ocorrer
// depois desse intervalo, nao e considerado parte da mesma queda.
const FREE_FALL_WINDOW_MS = 1000;

export default function FallDetector() {
  const [accelData, setAccelData] = useState({ x: 0, y: 0, z: 0 });
  const [gyroData, setGyroData] = useState({ x: 0, y: 0, z: 0 });
  const [gyroAvailable, setGyroAvailable] = useState(false);
  const [fallHistory, setFallHistory] = useState([]);
  const [monitoring, setMonitoring] = useState(true);

  // Refs para valores mutaveis acessados dentro do listener do acelerometro,
  // evitando o problema de closure obsoleto com useState.
  const freeFallTimestamp = useRef(null);
  const lastFallTime = useRef(0);
  const accelSubRef = useRef(null);
  const gyroSubRef = useRef(null);
  const gyroDataRef = useRef({ x: 0, y: 0, z: 0 });

  // Algoritmo de deteccao em duas fases:
  //   1. Queda livre: magnitude do acelerometro proximo de 0g
  //   2. Impacto: pico de forca G logo apos a queda livre
  // O giroscopio atua como sensor auxiliar, confirmando rotacao durante o evento.
  const detectFall = useCallback(({ x, y, z }) => {
    const now = Date.now();
    const gForce = Math.sqrt(x * x + y * y + z * z);

    // Fase 1: registra o momento em que a queda livre foi detectada
    if (gForce < FREE_FALL_THRESHOLD) {
      freeFallTimestamp.current = now;
    }

    // Fase 2: verifica se houve impacto apos uma queda livre recente
    if (gForce > IMPACT_THRESHOLD && freeFallTimestamp.current) {
      const timeSinceFreeFall = now - freeFallTimestamp.current;
      const timeSinceLastFall = now - lastFallTime.current;

      if (timeSinceFreeFall < FREE_FALL_WINDOW_MS && timeSinceLastFall > COOLDOWN_MS) {
        // Consulta o giroscopio para verificacao auxiliar
        const gyro = gyroDataRef.current;
        const rotationRate = Math.sqrt(
          gyro.x * gyro.x + gyro.y * gyro.y + gyro.z * gyro.z,
        );
        const gyroConfirmed = rotationRate > GYRO_THRESHOLD;

        lastFallTime.current = now;
        freeFallTimestamp.current = null;

        const fallEvent = {
          id: now.toString(),
          timestamp: new Date(now).toLocaleTimeString("pt-BR"),
          gForce: gForce.toFixed(2),
          gyroConfirmed,
        };

        setFallHistory((prev) => [fallEvent, ...prev]);

        Alert.alert(
          "Queda Detectada!",
          `Impacto de ${fallEvent.gForce}g registrado.\n` +
            `Giroscopio: ${gyroConfirmed ? "confirmou" : "nao confirmou"} a queda.\n` +
            `Horario: ${fallEvent.timestamp}`,
          [{ text: "OK" }],
        );
      }
    }
  }, []);

  const subscribe = useCallback(() => {
    // Acelerometro: sensor principal, leitura a cada 100ms
    Accelerometer.setUpdateInterval(100);
    accelSubRef.current = Accelerometer.addListener((data) => {
      setAccelData(data);
      detectFall(data);
    });

    // Giroscopio: sensor auxiliar (nem todos os dispositivos possuem)
    Gyroscope.isAvailableAsync().then((available) => {
      setGyroAvailable(available);
      if (available) {
        Gyroscope.setUpdateInterval(100);
        gyroSubRef.current = Gyroscope.addListener((data) => {
          setGyroData(data);
          gyroDataRef.current = data;
        });
      }
    });
  }, [detectFall]);

  const unsubscribe = useCallback(() => {
    accelSubRef.current?.remove();
    gyroSubRef.current?.remove();
    accelSubRef.current = null;
    gyroSubRef.current = null;
  }, []);

  const toggleMonitoring = useCallback(() => {
    if (monitoring) {
      unsubscribe();
    } else {
      subscribe();
    }
    setMonitoring((prev) => !prev);
  }, [monitoring, subscribe, unsubscribe]);

  useEffect(() => {
    subscribe();
    return () => unsubscribe();
  }, [subscribe, unsubscribe]);

  const gForce = Math.sqrt(
    accelData.x * accelData.x +
      accelData.y * accelData.y +
      accelData.z * accelData.z,
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Monitor de Quedas</Text>

      <View
        style={[
          styles.statusBadge,
          { backgroundColor: monitoring ? "#4CAF50" : "#9E9E9E" },
        ]}
      >
        <Text style={styles.statusText}>
          {monitoring ? "Monitorando" : "Pausado"}
        </Text>
      </View>

      {/* Card do acelerometro com leituras em tempo real */}
      <View style={styles.sensorCard}>
        <Text style={styles.sensorTitle}>Acelerometro</Text>
        <Text style={styles.text}>X: {accelData.x.toFixed(2)} g</Text>
        <Text style={styles.text}>Y: {accelData.y.toFixed(2)} g</Text>
        <Text style={styles.text}>Z: {accelData.z.toFixed(2)} g</Text>
        <Text style={styles.gForceText}>Forca G: {gForce.toFixed(2)} g</Text>
      </View>

      {/* Card do giroscopio; exibe aviso se indisponivel no dispositivo */}
      <View style={styles.sensorCard}>
        <Text style={styles.sensorTitle}>
          Giroscopio{!gyroAvailable && " (indisponivel)"}
        </Text>
        <Text style={styles.text}>X: {gyroData.x.toFixed(2)} rad/s</Text>
        <Text style={styles.text}>Y: {gyroData.y.toFixed(2)} rad/s</Text>
        <Text style={styles.text}>Z: {gyroData.z.toFixed(2)} rad/s</Text>
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: monitoring ? "#F44336" : "#4CAF50" },
        ]}
        onPress={toggleMonitoring}
      >
        <Text style={styles.buttonText}>
          {monitoring ? "Pausar" : "Iniciar"}
        </Text>
      </TouchableOpacity>

      {/* Historico de quedas detectadas com timestamp e detalhes */}
      <Text style={styles.historyTitle}>
        Historico ({fallHistory.length})
      </Text>

      {fallHistory.length === 0 ? (
        <Text style={styles.emptyText}>Nenhuma queda detectada.</Text>
      ) : (
        <FlatList
          data={fallHistory}
          keyExtractor={(item) => item.id}
          style={styles.historyList}
          renderItem={({ item }) => (
            <View style={styles.historyItem}>
              <Text style={styles.historyTime}>{item.timestamp}</Text>
              <Text style={styles.historyDetail}>
                Impacto: {item.gForce}g | Giroscopio:{" "}
                {item.gyroConfirmed ? "Confirmado" : "Nao confirmado"}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
    backgroundColor: "#F5F5F5",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    color: "#333",
  },
  statusBadge: {
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginVertical: 10,
  },
  statusText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  sensorCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sensorTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#555",
    marginBottom: 8,
  },
  text: {
    fontSize: 16,
    color: "#333",
    marginVertical: 2,
  },
  gForceText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1976D2",
    marginTop: 8,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 10,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 10,
    marginBottom: 6,
  },
  emptyText: {
    color: "#999",
    fontSize: 14,
    textAlign: "center",
    marginTop: 10,
  },
  historyList: {
    flex: 1,
  },
  historyItem: {
    backgroundColor: "#FFF3E0",
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
    borderLeftWidth: 4,
    borderLeftColor: "#FF9800",
  },
  historyTime: {
    fontWeight: "bold",
    color: "#E65100",
    fontSize: 14,
  },
  historyDetail: {
    color: "#555",
    fontSize: 13,
    marginTop: 4,
  },
});
