import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { RootParamNavigation } from './src/navigation/RootNavigation';

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <RootParamNavigation />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
