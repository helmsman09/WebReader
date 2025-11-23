import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LibraryScreen from "./src/screens/LibraryScreen";
import AddContentScreen from "./src/screens/AddContentScreen";
import PageDetailScreen from "./src/screens/PageDetailScreen";
import LinkFromQrScreen from "./src/screens/LinkFromQrScreen";

export type RootStackParamList = {
  Library: { justUploaded?: boolean } | undefined;
  AddContent: undefined;
  PageDetail: { pageId: string };
  LinkFromQR: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Library" component={LibraryScreen} />
        <Stack.Screen name="AddContent" component={AddContentScreen} />
        <Stack.Screen name="PageDetail" component={PageDetailScreen} />
        <Stack.Screen name="LinkFromQR" component={LinkFromQrScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
