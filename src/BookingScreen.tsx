import React, { useEffect, useState } from "react";
import { View, Text, FlatList } from "react-native";
import { apiGet } from "../utils/api";

export default function BookingScreen() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<any[]>("/bookings")
      .then(setBookings)
      .catch((err) => console.error("Error fetching bookings:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Text>Loading bookings...</Text>;

  return (
    <FlatList
      data={bookings}
      keyExtractor={(item, index) => index.toString()}
      renderItem={({ item }) => (
        <View style={{ padding: 10 }}>
          <Text>📅 {item.date}</Text>
          <Text>👤 {item.customer}</Text>
          <Text>🎶 {item.service}</Text>
        </View>
      )}
    />
  );
}
