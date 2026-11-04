import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { RootParamNavigation } from './src/navigation/RootNavigation';
import { initializeDatabase } from './src/services/database/connection';

export default function App() {
  useEffect(() => {
    initializeDatabase().catch((error) => {
      console.error('Failed to initialize database', error);
    });
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <RootParamNavigation />
    </NavigationContainer>
  );
}
