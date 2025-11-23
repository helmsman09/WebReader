import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { BarCodeScanner } from "expo-barcode-scanner";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { RootStackParamList } from "../../App";

type Nav = NativeStackNavigationProp<RootStackParamList, "LinkFromQR">;

export const LinkFromQrScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const handleScan = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    try {
      const payload = JSON.parse(data);
      if (!payload.apiKey) {
        throw new Error("No apiKey field in QR");
      }

      await AsyncStorage.setItem("nc_api_key", payload.apiKey);

      // optionally also store backend/dashboard overrides
      if (payload.backendUrl) {
        await AsyncStorage.setItem("nc_backend_url", payload.backendUrl);
      }
      if (payload.dashboardUrl) {
        await AsyncStorage.setItem("nc_dashboard_url", payload.dashboardUrl);
      }

      Alert.alert("Linked", "This device is now linked to your reading profile.", [
        {
          text: "OK",
          onPress: () => nav.goBack()
        }
      ]);
    } catch (e: any) {
      console.log("QR parse error", e);
      Alert.alert(
        "Invalid QR",
        e?.message || "Could not read API key from QR code."
      );
      setScanned(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Requesting camera permission…</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.center}>
        <Text style={{ textAlign: "center" }}>
          Camera access is required to scan a QR code.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Link from QR</Text>
      <Text style={styles.subtitle}>
        Point your camera at the QR code on your dashboard to link this device
        to the same reading profile.
      </Text>
      <View style={styles.scannerBox}>
        <BarCodeScanner
          style={{ width: "100%", height: "100%" }}
          onBarCodeScanned={scanned ? undefined : handleScan}
        />
      </View>
      <Text style={styles.hint}>
        The QR encodes your API key and backend URL. Use only codes you trust.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6
  },
  subtitle: {
    fontSize: 13,
    color: "#555",
    marginBottom: 12
  },
  scannerBox: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: 12
  },
  hint: {
    fontSize: 11,
    color: "#777",
    marginTop: 4
  }
});
