import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { apiGet } from "../utils/api";

export default function ProProfileScreen() {
  const [profile, setProfile] = useState<any | null>(null);

  useEffect(() => {
    apiGet<any>("/profiles/123") // sample profile
      .then(setProfile)
      .catch((err) => console.error("Error fetching profile:", err));
  }, []);

  if (!profile) return <Text>Loading profile...</Text>;

  return (
    <View style={{ padding: 20 }}>
      <Text>🎤 {profile.name}</Text>
      <Text>⭐ {profile.rating} stars</Text>
    </View>
  );
}
