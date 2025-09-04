import React, { useEffect, useState } from "react";
import { View, Text, FlatList } from "react-native";
import { apiGet } from "../utils/api";

export default function MessagingScreen() {
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    apiGet<any[]>("/messages")
      .then(setMessages)
      .catch((err) => console.error("Error fetching messages:", err));
  }, []);

  return (
    <FlatList
      data={messages}
      keyExtractor={(item, index) => index.toString()}
      renderItem={({ item }) => (
        <View style={{ padding: 10, borderBottomWidth: 1 }}>
          <Text>👤 {item.from}</Text>
          <Text>{item.text}</Text>
        </View>
      )}
    />
  );
}
