import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, Alert } from "react-native";
import { Accelerometer } from "expo-sensors";

export default function FallDetector() {
  const [data, setData] = useState({ x: 0, y: 0, z: 0 });
  const [subscription, setSubscription] = useState(null);
  const [fallDetected, setFallDetected] = useState(false);

  const IMPACT_THRESHOLD = 3.0;

  const subscribe = () => {
    Accelerometer.setUpdateInterval(100);

    setSubscription(
      Accelerometer.addListener((accelerometerData) => {
        setData(accelerometerData);
        detectFall(accelerometerData);
      }),
    );
  };

  const unsubscribe = () => {
    if (subscription) {
      subscription.remove();
    }
    setSubscription(null);
  };

  const detectFall = ({ x, y, z }) => {
    const gForce = Math.sqrt(x * x + y * y + z * z);

    if (gForce > IMPACT_THRESHOLD && !fallDetected) {
      setFallDetected(true);
      Alert.alert(
        "Queda Detectada!",
        "O acelerômetro registrou um impacto equivalente a uma queda.",
        [{ text: "OK", onPress: () => setFallDetected(false) }],
      );
    }
  };

  useEffect(() => {
    subscribe();
    return () => unsubscribe();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Monitor de Quedas</Text>

      <View style={styles.sensorData}>
        <Text style={styles.text}>Eixo X: {data.x.toFixed(2)}</Text>
        <Text style={styles.text}>Eixo Y: {data.y.toFixed(2)}</Text>
        <Text style={styles.text}>Eixo Z: {data.z.toFixed(2)}</Text>
      </View>

      {fallDetected && (
        <Text style={styles.alert}>⚠️ Possível queda detectada!</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5FCFF",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 30,
  },
  sensorData: {
    marginBottom: 30,
    alignItems: "center",
  },
  text: {
    fontSize: 18,
    marginVertical: 5,
  },
  alert: {
    fontSize: 20,
    color: "red",
    fontWeight: "bold",
  },
});
