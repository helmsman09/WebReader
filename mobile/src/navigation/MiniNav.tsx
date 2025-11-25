// src/navigation/MiniNav.tsx

import React, { useState } from "react";
import type { RootStackParamList, ScreenName } from "./RootStack";

// Each stack entry is a route: name + params
type StackEntry = {
  name: ScreenName;
  params: any;
};

// The navigation object passed to screens
export type MiniNav = {
  navigate: <K extends ScreenName>(name: K, params?: RootStackParamList[K]) => void;
  goBack: () => void;
  reset: <K extends ScreenName>(name: K, params?: RootStackParamList[K]) => void;
};

// Props every screen component receives
export type ScreenComponentProps<K extends ScreenName> = {
  nav: MiniNav;
  route: { name: K; params: RootStackParamList[K] };
};

// Map from route name -> screen component
export type MiniNavigatorScreens = {
  [K in ScreenName]: React.ComponentType<ScreenComponentProps<K>>;
};

type MiniNavigatorProps = {
  initialRouteName: ScreenName;
  initialParams?: any;
  screens: MiniNavigatorScreens;
};

export const MiniNavigator: React.FC<MiniNavigatorProps> = ({
  initialRouteName,
  initialParams,
  screens,
}) => {
  // history stack, last item is current screen
  const [stack, setStack] = useState<StackEntry[]>([
    { name: initialRouteName, params: initialParams } as StackEntry,
  ]);

  const current = stack[stack.length - 1];

  const nav: MiniNav = {
    navigate: (name, params) => {
      setStack((prev) => [...prev, { name, params: params as any }]);
    },
    goBack: () => {
      setStack((prev) => prev.length > 1 ? prev.slice(0, -1) : prev);
    },
    reset: (name, params) => {
      setStack([{ name, params: params as any }]);
    },
  };

  const ScreenComponent = screens[current.name];

  if (!ScreenComponent) {
    // Should never really happen
    return (
      <React.Fragment>
        <ScreenFallback />
      </React.Fragment>
    );
  }

  return (
    <ScreenComponent
      // TS knows K by indexed access on ScreenName
      // but at runtime we just pass what we have
      nav={nav}
      route={current as any}
    />
  );
};

const ScreenFallback = () => {
  return (
    <></>
  );
};
