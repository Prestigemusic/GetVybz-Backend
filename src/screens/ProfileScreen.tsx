import React from 'react';
import { StyleSheet, View, Text, Image, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

// Placeholder data - this will be replaced with real user data from your API
const userProfile = {
  id: 'user123',
  name: 'John Doe',
  username: 'johndoe',
  bio: 'Passionate creator and music lover. Spreading good vibes and great tunes. 🎵',
  profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a3dd7872167?fit=crop&w=800&h=800&q=80',
  coverPhoto: 'https://images.unsplash.com/photo-1518609592534-738944517174?fit=crop&w=1600&h=900&q=80',
  followers: 1250,
  following: 320,
};

const ProfileScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Cover Photo */}
        <Image
          source={{ uri: userProfile.coverPhoto }}
          style={styles.coverPhoto}
        />

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Image
            source={{ uri: userProfile.profilePicture }}
            style={styles.profilePicture}
          />

          <View style={styles.headerInfo}>
            <Text style={styles.name}>{userProfile.name}</Text>
            <Text style={styles.username}>@{userProfile.username}</Text>
          </View>
          
          <TouchableOpacity style={styles.editButton}>
            <Feather name="edit-2" size={18} color="#000" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Text style={styles.statCount}>{userProfile.followers}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statCount}>{userProfile.following}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>

        {/* Bio Section */}
        <View style={styles.bioContainer}>
          <Text style={styles.bioText}>{userProfile.bio}</Text>
        </View>

        {/* Placeholder for content (e.g., posts, music) */}
        <View style={styles.contentContainer}>
          <Text style={styles.contentPlaceholder}>
            User's posts, videos, or music will go here.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  coverPhoto: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginTop: -70,
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
    backgroundColor: '#eee',
    marginRight: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  username: {
    fontSize: 18,
    color: '#666',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  editButtonText: {
    marginLeft: 5,
    fontWeight: '600',
    fontSize: 14,
    color: '#000',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    backgroundColor: '#f8f8f8',
    marginHorizontal: 20,
    borderRadius: 10,
  },
  stat: {
    alignItems: 'center',
  },
  statCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  statLabel: {
    fontSize: 14,
    color: '#888',
  },
  bioContainer: {
    padding: 20,
  },
  bioText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fafafa',
    margin: 20,
    borderRadius: 10,
  },
  contentPlaceholder: {
    fontSize: 16,
    color: '#aaa',
    fontStyle: 'italic',
  },
});

export default ProfileScreen;