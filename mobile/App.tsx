// App.tsx (mobile)

import React from "react";
import { MiniNavigator, MiniNavigatorScreens } from "./src/navigation/MiniNav";
import { RootStackParamList } from "./src/navigation/RootStack";

import { LibraryScreen } from "./src/screens/LibraryScreen";
import { AddContentScreen } from "./src/screens/AddContentScreen";
import { PageDetailScreen } from "./src/screens/PageDetailScreen";
import { LinkFromQrScreen } from "./src/screens/LinkFromQrScreen";

// Tell TS the shape of the screens map
const screens: MiniNavigatorScreens = {
  Library: LibraryScreen,
  AddContent: AddContentScreen,
  PageDetail: PageDetailScreen,
  LinkFromQR: LinkFromQrScreen,
};

export default function App() {
  return (
    <MiniNavigator
      initialRouteName="Library"
      screens={screens}
      // initialParams is optional; Library has `undefined | { justUploaded?: boolean }`
      initialParams={undefined as RootStackParamList["Library"]}
    />
  );
}
