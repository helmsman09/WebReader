// App.tsx in mobile

import React, { useState } from "react";
import { View, Text } from "react-native";
import { LibraryScreen } from "./src/screens/LibraryScreen";
import { AddContentScreen } from "./src/screens/AddContentScreen";
import { PageDetailScreen } from "./src/screens/PageDetailScreen";
import { LinkFromQrScreen } from "./src/screens/LinkFromQrScreen";

type ScreenName = "Library" | "AddContent" | "PageDetail" | "LinkFromQR";

type ScreenState =
  | { name: "Library"; params?: { justUploaded?: boolean } }
  | { name: "AddContent" }
  | { name: "PageDetail"; params: { pageId: string } }
  | { name: "LinkFromQR" };

export type MiniNav = {
  navigate: (screen: ScreenState) => void;
  goBack: () => void;
};

export default function App() {
  const [stack, setStack] = useState<ScreenState[]>([
    { name: "Library" },
  ]);

  const nav: MiniNav = {
    navigate: (screen) => {
      setStack((prev) => [...prev, screen]);
    },

    goBack: () => {
      setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
    },
  };

  const current = stack[stack.length - 1];

  // Render current screen
  if (current.name === "Library") {
    return <LibraryScreen nav={nav} justUploaded={current.params?.justUploaded} />;
  }
  if (current.name === "AddContent") {
    return <AddContentScreen nav={nav} />;
  }
  if (current.name === "PageDetail") {
    return <PageDetailScreen nav={nav} pageId={current.params.pageId} />;
  }
  if (current.name === "LinkFromQR") {
    return <LinkFromQrScreen nav={nav} />;
  }

  return <View><Text>Unknown screen</Text></View>;
}
